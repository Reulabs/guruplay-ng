import 'node:process';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import '../../../packages/common/server/env.mjs';

const required = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const maxBytes = Number(process.env.MAX_AUDIO_UPLOAD_BYTES || 200 * 1024 * 1024);
const maxDurationSeconds = Number(process.env.MAX_AUDIO_DURATION_SECONDS || 900);
const workerId = `${process.env.HOSTNAME || 'worker'}-${randomUUID()}`;
let stopping = false;

const run = (command, args, timeout = 120_000) => new Promise((resolve, reject) => {
  const process = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => process.kill('SIGKILL'), timeout);
  process.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  process.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  process.on('error', reject);
  process.on('close', (code) => {
    clearTimeout(timer);
    if (code === 0) resolve({ stdout, stderr });
    else reject(new Error(`${command} failed (${code}): ${stderr.slice(-1000)}`));
  });
});

async function processAudio(job) {
  const { data: asset, error: assetError } = await supabase.from('song_assets')
    .select('song_id,full_object_path').eq('song_id', job.song_id).single();
  if (assetError || !asset.full_object_path) throw new Error('Source audio asset is missing.');
  await supabase.from('songs').update({ processing_status: 'processing' }).eq('id', job.song_id);
  const { data: source, error: downloadError } = await supabase.storage.from('song-audio').download(asset.full_object_path);
  if (downloadError || !source) throw new Error('Unable to download source audio from private storage.');
  const workDir = await mkdtemp(join(tmpdir(), 'guruplay-audio-'));
  const input = join(workDir, 'source.bin');
  const normalized = join(workDir, 'normalized.mp3');
  const preview = join(workDir, 'preview.mp3');
  try {
    await writeFile(input, Buffer.from(await source.arrayBuffer()), { flag: 'wx' });
    const file = await stat(input);
    if (!file.size || file.size > maxBytes) throw new Error('Audio file is empty or exceeds the configured upload limit.');
    const probe = await run(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration,bit_rate:format_tags=title,artist',
      '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', input,
    ]);
    const metadata = JSON.parse(probe.stdout);
    const audioStream = metadata.streams?.find((stream) => stream.codec_type === 'audio');
    const duration = Number(metadata.format?.duration);
    const bitrate = Number(metadata.format?.bit_rate);
    if (!audioStream || !duration || duration <= 0 || duration > maxDurationSeconds) throw new Error('Audio stream is unsupported or exceeds the duration limit.');
    const validCodecs = new Set(['mp3', 'aac', 'flac', 'vorbis', 'opus', 'pcm_s16le', 'alac', 'wavpack']);
    if (!validCodecs.has(audioStream.codec_name)) throw new Error('Audio codec is not supported.');
    await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-vn', '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '192k', normalized]);
    await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', normalized, '-t', '30', '-codec:a', 'libmp3lame', '-b:a', '128k', preview]);
    const normalizedBytes = await readFile(normalized);
    const previewBytes = await readFile(preview);
    const fullPath = `${job.song_id}/audio.mp3`;
    const previewPath = `${job.song_id}/${randomUUID()}.mp3`;
    const fullUpload = await supabase.storage.from('song-audio').upload(fullPath, normalizedBytes, { contentType: 'audio/mpeg', upsert: true });
    if (fullUpload.error) throw new Error('Unable to save normalized full audio.');
    const previewUpload = await supabase.storage.from('song-previews').upload(previewPath, previewBytes, { contentType: 'audio/mpeg', upsert: true });
    if (previewUpload.error) throw new Error('Unable to save public preview.');
    const checksum = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(normalizedBytes).digest('hex'));
    const { error: assetUpdateError } = await supabase.from('song_assets').update({
      full_object_path: fullPath, preview_object_path: previewPath,
      detected_mime_type: 'audio/mpeg', duration_seconds: Math.round(duration),
      bitrate: Number.isFinite(bitrate) ? bitrate : null, checksum_sha256: checksum,
    }).eq('song_id', job.song_id);
    if (assetUpdateError) throw new Error('Unable to record processed audio metadata.');
    const { error: songUpdateError } = await supabase.from('songs').update({ duration: Math.round(duration), processing_status: 'ready' }).eq('id', job.song_id);
    if (songUpdateError) throw new Error('Unable to publish processed audio status.');
    const { error: jobUpdateError } = await supabase.from('media_jobs').update({ status: 'completed', lease_expires_at: null, leased_by: null, last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
    if (jobUpdateError) throw new Error('Unable to complete media job.');
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function recordFailure(job, error) {
  const dead = job.attempts >= 8;
  const baseDelay = Math.min(60 * 60, 15 * 2 ** Math.min(job.attempts, 8));
  const delay = Math.round(baseDelay * (0.8 + Math.random() * 0.4));
  const { error: jobError } = await supabase.from('media_jobs').update({
    status: dead ? 'dead' : 'retry',
    available_at: new Date(Date.now() + delay * 1000).toISOString(),
    lease_expires_at: null,
    leased_by: null,
    last_error: String(error?.message || 'Audio processing failed.').slice(0, 1000),
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);
  if (jobError) process.stderr.write(`media job ${job.id} failure state could not be saved\n`);
  if (dead) await supabase.from('songs').update({ processing_status: 'failed' }).eq('id', job.song_id);
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

while (!stopping) {
  const { data: jobs, error } = await supabase.rpc('claim_media_job', { worker_id: workerId });
  if (error) {
    process.stderr.write('media worker could not claim a job\n');
    await sleep(5000);
    continue;
  }
  const job = jobs?.[0];
  if (!job) {
    await sleep(1500);
    continue;
  }
  const heartbeat = setInterval(() => {
    void supabase.from('media_jobs').update({
      lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing').eq('leased_by', workerId)
      .then(({ error }) => { if (error) process.stderr.write(`media job ${job.id} heartbeat failed\n`); });
  }, 60_000);
  heartbeat.unref?.();
  try {
    await processAudio(job);
  } catch (error) {
    await recordFailure(job, error);
  } finally {
    clearInterval(heartbeat);
  }
}

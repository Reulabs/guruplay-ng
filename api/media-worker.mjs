import { waitUntil } from '@vercel/functions';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { runMediaJob } from '../apps/web/server/media-jobs.mjs';

const require = createRequire(import.meta.url);
let activeJob;

export default function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Use POST for audio processing.' }));
  }
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const secret = process.env.MEDIA_WORKER_SECRET;
  const digest = (value) => createHash('sha256').update(value).digest();
  if (!secret || !timingSafeEqual(digest(token), digest(secret))) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Audio processing authorization failed.' }));
  }
  if (!activeJob) {
    const ffmpegPath = join(dirname(require.resolve('ffmpeg-static/package.json')), 'ffmpeg');
    const ffprobePath = join(dirname(require.resolve('ffprobe-static/package.json')), 'bin', process.platform, process.arch, 'ffprobe');
    activeJob = runMediaJob({ ffmpegPath, ffprobePath })
      .then((result) => { console.info(JSON.stringify({ event: 'media-job', ...result })); })
      .catch(() => { console.error('Audio processing could not start. The durable job remains available for retry.'); })
      .finally(() => { activeJob = undefined; });
  }
  waitUntil(activeJob);
  res.statusCode = 202;
  return res.end(JSON.stringify({ accepted: true }));
}

export const config = { maxDuration: 300 };

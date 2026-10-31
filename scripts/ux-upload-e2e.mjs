import '../packages/common/server/env.mjs';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const fixture = JSON.parse(await readFile('/tmp/guru-personal-e2e.json', 'utf8'));
const service = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const actors = {};
for (const account of [...fixture.accounts, { kind: 'admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }]) {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) throw error;
  actors[account.kind] = { token: data.session.access_token, id: data.user.id, db };
}
const results = [];
const pass = (name) => { results.push(name); console.log('PASS', name); };
const { data: song, error } = await service.from('songs').select('*').eq('user_id', actors.artist.id).eq('title', '[TEST] UX upload journey').single();
if (error) throw error;
const source = fixture.paths.find(path => path.startsWith(`${actors.artist.id}/${song.id}-`));
assert.ok(source);
const body = { uploadId: song.id, audioPath: source, title: song.title, artist: song.artist, genre: song.genre, coverUrl: song.cover_url };
async function post(actor, payload, expected) {
  const response = await fetch('http://127.0.0.1:8080/api/v1/media/songs/upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(25000),
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
await post(null, body, 401);
for (const actor of [actors.listener, actors.pending]) await post(actor, { ...body, audioPath: `${actor.id}/missing.wav` }, 403);
pass('anonymous, listener and pending artist uploads denied');
await post(actors.artist, { ...body, uploadId: 'invalid' }, 400);
await post(actors.artist, { ...body, genre: '   ' }, 400);
await post(actors.artist, { ...body, audioPath: `${actors.admin.id}/not-owned.wav` }, 400);
pass('invalid upload identifier, empty genre and foreign paths rejected');
for (let i = 0; i < 2; i++) assert.equal((await post(actors.artist, body, 202)).id, song.id);
const matching = await service.from('songs').select('id').eq('id', song.id);
assert.equal(matching.data.length, 1);
pass('same-owner retry returned the original durable upload without duplicates');
await post(actors.artist, { ...body, title: 'Changed details' }, 409);
await post(actors.admin, { ...body, audioPath: `${actors.admin.id}/missing.wav` }, 404);
pass('changed retry details and another uploader cannot reuse the upload identifier');
assert.equal(song.processing_status, 'ready');
assert.equal(song.approval_status, 'pending');
const hidden = await actors.listener.db.from('public_catalog').select('id').eq('id', song.id);
if (hidden.error) throw hidden.error;
assert.equal(hidden.data.length, 0);
const jobs = await service.from('media_jobs').select('status,attempts').eq('song_id', song.id);
assert.equal(jobs.data.length, 1);
assert.equal(jobs.data[0].status, 'completed');
pass('real browser upload processed once and remains hidden while awaiting moderation');
await writeFile('docs/ux-upload-status.json', JSON.stringify({ testedAt: new Date().toISOString(), project: 'fuquclbwwofwugkxirrl', environment: 'local app with real Supabase', checks: results }, null, 2) + '\n');

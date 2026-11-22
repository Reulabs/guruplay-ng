import '../packages/common/server/env.mjs';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { runMediaJob } from '../apps/web/server/media-jobs.mjs';

const file = '/tmp/guruplay-bachs-e2e.json';
const baseUrl = process.env.BACHS_TEST_APP_URL || 'http://127.0.0.1:8090';
if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) throw new Error('Use the isolated loopback test app.');
const service = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = () => createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const checked = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const save = (fixture) => writeFile(file, JSON.stringify(fixture), { mode: 0o600 });
const phase = process.argv[2];
if (phase === 'setup' && existsSync(file)) throw new Error('Clean up the previous disposable test run before creating another.');
let fixture = phase === 'setup' ? { accounts: [], checks: [], createdAt: new Date().toISOString() } : JSON.parse(await readFile(file, 'utf8'));
async function pass(name) { fixture.checks.push(name); await save(fixture); console.log('PASS', name); }
async function actor(account) {
  const db = client();
  const auth = checked(await db.auth.signInWithPassword({ email: account.email, password: account.password }));
  return { db, token: auth.session.access_token, id: auth.user.id };
}
async function request(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(`${baseUrl}/api/v1/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000),
  });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}

if (phase === 'setup') {
  await save(fixture);
  for (const kind of ['listener', 'other']) {
    const email = `guru-bachs-${Date.now()}-${kind}@example.com`, password = `T!${randomUUID()}x9`;
    const { user } = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `[TEST] Bachs ${kind}` } }));
    fixture.accounts.push({ kind, id: user.id, email, password }); await save(fixture);
    checked(await service.from('users').upsert({ id: user.id, email, display_name: `[TEST] Bachs ${kind}`, user_type: 'user', account_status: 'active' }));
  }
}
if (phase === 'setup' || phase === 'checkout') {
  const listener = await actor(fixture.accounts[0]);
  await request('billing/checkout', null, 'POST', {}, 401);
  await request('internal/reconcile', null, 'GET', undefined, 401);
  assert.equal((await request('billing/subscription', listener.token)).entitled, false);
  await pass('anonymous checkout and reconciliation denied; unpaid listener has no full access');
  const [first, second] = await Promise.all([
    request('billing/checkout', listener.token, 'POST', { amount: 1, currency: 'USD' }),
    request('billing/checkout', listener.token, 'POST', {}),
  ]);
  assert.equal(first.reference, second.reference); assert.equal(first.authorizationUrl, second.authorizationUrl);
  fixture.checkout = first; await save(fixture);
  const row = checked(await service.from('bachs_checkouts').select('expected_amount,currency,environment').eq('reference', first.reference).single());
  assert.deepEqual(row, { expected_amount: 100000, currency: 'NGN', environment: 'sandbox' });
  await request('billing/verify', listener.token, 'POST', { reference: first.reference }, 409);
  assert.equal((await request('billing/subscription', listener.token)).entitled, false);
  await pass('concurrent checkout reused one provider session; client price ignored; unpaid callback did not unlock access');
  if (!fixture.otherCheckout) {
    const other = await actor(fixture.accounts[1]);
    const attempts = await Promise.all([request('billing/checkout', other.token, 'POST', {}), request('billing/checkout', other.token, 'POST', {})]);
    assert.equal(attempts[0].reference, attempts[1].reference);
    assert.equal(attempts[0].authorizationUrl, attempts[1].authorizationUrl);
    fixture.otherCheckout = attempts[0]; await save(fixture);
    await pass('simultaneous first-time provider writes recovered safely with one idempotency key');
  }
  console.log('Sandbox checkout ready for browser testing.');
} else if (phase === 'failed') {
  const other = await actor(fixture.accounts[1]);
  const result = await request('billing/verify', other.token, 'POST', { reference: fixture.otherCheckout.reference }, 409);
  assert.match(result.error, /payment didn’t go through/);
  assert.equal((await request('billing/subscription', other.token)).entitled, false);
  await pass('documented declined sandbox card gave readable feedback and never granted access');
} else if (phase === 'media') {
  const admin = await actor({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (!fixture.songId) {
    fixture.songId = randomUUID(); fixture.sourcePath = `${admin.id}/${fixture.songId}-bachs-e2e.wav`; await save(fixture);
    await promisify(execFile)('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=45', '-ar', '44100', '-ac', '1', '/tmp/guruplay-bachs-e2e.wav']);
    checked(await service.storage.from('song-audio').upload(fixture.sourcePath, await readFile('/tmp/guruplay-bachs-e2e.wav'), { contentType: 'audio/wav' }));
    await request('media/songs/upload', admin.token, 'POST', { uploadId: fixture.songId, audioPath: fixture.sourcePath, title: '[TEST] Bachs paid playback', artist: 'Guruplay sandbox', genre: 'Ambient' }, 202);
  }
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const song = checked(await service.from('songs').select('processing_status').eq('id', fixture.songId).single());
    if (song.processing_status === 'ready') { ready = true; break; }
    if (song.processing_status === 'failed') throw new Error('Test audio processing failed.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true);
  const catalog = checked(await client().from('public_catalog').select('id').eq('id', fixture.songId));
  assert.equal(catalog.length, 1);
  const other = await actor(fixture.accounts[1]);
  await request(`streams/${fixture.songId}/session`, null, 'POST', {}, 401);
  await request(`streams/${fixture.songId}/session`, other.token, 'POST', {}, 402);
  await pass('real upload processed into preview and private full audio; unpaid playback denied');
} else if (phase === 'processor') {
  const song = checked(await service.from('songs').select('title').eq('id', fixture.songId).single());
  assert.equal(song.title, '[TEST] Bachs paid playback');
  checked(await service.from('songs').update({ processing_status: 'uploaded' }).eq('id', fixture.songId));
  checked(await service.from('song_assets').update({ full_object_path: fixture.sourcePath }).eq('song_id', fixture.songId));
  checked(await service.from('media_jobs').update({ status: 'queued', attempts: 0, available_at: new Date().toISOString(), lease_expires_at: null, leased_by: null }).eq('song_id', fixture.songId));
  const result = await runMediaJob();
  assert.equal(result.status, 'completed');
  assert.equal(checked(await service.from('songs').select('processing_status').eq('id', fixture.songId).single()).processing_status, 'ready');
  await pass('bounded reusable processor claimed the real durable job and generated protected full audio plus a preview');
} else if (phase === 'paid') {
  const listener = await actor(fixture.accounts[0]), other = await actor(fixture.accounts[1]);
  await request('billing/verify', other.token, 'POST', { reference: fixture.checkout.reference }, 404);
  await request('billing/verify', listener.token, 'POST', { reference: '<script>' }, 400);
  const before = checked(await service.from('bachs_payment_passes').select('*').eq('checkout_reference', fixture.checkout.reference).single());
  for (let i = 0; i < 2; i++) await request('billing/verify', listener.token, 'POST', { reference: fixture.checkout.reference });
  const after = checked(await service.from('bachs_payment_passes').select('*').eq('checkout_reference', fixture.checkout.reference).single());
  assert.equal(after.paid_through, before.paid_through);
  const status = await request('billing/subscription', listener.token);
  assert.equal(status.entitled, true); assert.equal(status.provider, 'bachs'); assert.equal(status.renewalMode, 'manual'); assert.equal(status.graceEndsAt, null);
  await request('billing/checkout', listener.token, 'POST', {}, 409);
  await pass('verified payment grants manual-renewal Premium; another account cannot claim it; replay never extends access');
  const live = await fetch('http://127.0.0.1:8080/api/v1/billing/subscription', { headers: { Authorization: `Bearer ${listener.token}` } });
  assert.equal((await live.json()).entitled, false);
  await pass('sandbox purchase cannot unlock the live-configured application');
  fixture.confirmedPass = after; await save(fixture);
  if (fixture.songId) {
    const stream = await request(`streams/${fixture.songId}/session`, listener.token, 'POST', {});
    assert.equal(stream.access, 'full');
    const audio = await fetch(stream.url, { headers: { Range: 'bytes=0-511' } });
    assert.ok([200, 206].includes(audio.status));
    assert.match(audio.headers.get('content-type'), /audio/);
    assert.ok((await audio.arrayBuffer()).byteLength > 0);
    await pass('paid listener received a private signed stream and downloaded real processed audio');
  }
  const events = checked(await service.from('bachs_webhook_events').select('event_type,status').eq('environment', 'sandbox'));
  assert.ok(events.some((event) => event.event_type === 'checkout.completed' && event.status === 'processed'));
  await pass('real Bachs sandbox webhook was received, signature checked and processed');
} else if (phase === 'permissions') {
  const listener = await actor(fixture.accounts[0]);
  for (const table of ['bachs_checkouts', 'bachs_payment_passes', 'bachs_webhook_events']) {
    const result = await listener.db.from(table).select('*');
    assert.equal(result.error?.code, '42501');
  }
  const grant = await listener.db.rpc('fulfill_bachs_checkout', {
    p_reference: fixture.checkout.reference, p_checkout_id: 'chk_untrusted', p_payment_id: 'ch_untrusted',
    p_paid_at: new Date().toISOString(), p_environment: 'sandbox',
  });
  assert.equal(grant.error?.code, '42501');
  const checkout = checked(await service.from('bachs_checkouts').select('provider_checkout_id').eq('reference', fixture.checkout.reference).single());
  const events = checked(await service.from('bachs_webhook_events').select('payload')
    .eq('payload->data->>checkout_id', checkout.provider_checkout_id).eq('event_type', 'checkout.completed'));
  assert.ok(events[0]);
  const raw = JSON.stringify(events[0].payload);
  const before = checked(await service.from('bachs_payment_passes').select('paid_through').eq('checkout_reference', fixture.checkout.reference).single());
  for (const tampered of [false, false, true]) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', process.env.BACHS_SANDBOX_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
    const response = await fetch(`${baseUrl}/api/v1/webhooks/bachs`, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Bachs-Signature-V2': `t=${timestamp},v1=${signature}`,
    }, body: tampered ? `${raw} ` : raw });
    assert.equal(response.status, tampered ? 401 : 200);
  }
  const after = checked(await service.from('bachs_payment_passes').select('paid_through').eq('checkout_reference', fixture.checkout.reference).single());
  assert.equal(after.paid_through, before.paid_through);
  await pass('direct client ledger access and forged grants denied; authentic webhook replay stayed idempotent; tampering rejected');
} else if (phase === 'personal') {
  const listener = await actor(fixture.accounts[0]), other = await actor(fixture.accounts[1]);
  await request('me/settings', listener.token, 'PATCH', { user_type: 'admin' }, 400);
  await request('me/settings', listener.token, 'PATCH', { volume: 0.25, autoplay: false, private_session: false });
  assert.equal((await request('me/settings', listener.token)).preferences.volume, 0.25);
  for (let i = 0; i < 2; i++) await request(`library/songs/${fixture.songId}`, listener.token, 'PUT');
  assert.equal((await request('library', listener.token)).saved.length, 1);
  assert.equal((await request('library', other.token)).saved.length, 0);
  await request(`library/songs/${fixture.songId}`, listener.token, 'DELETE');
  assert.equal((await request('library', listener.token)).saved.length, 0);
  const { item: playlist } = await request('playlists', listener.token, 'POST', { name: '[TEST] Bachs playlist', description: 'Disposable regression check' });
  await request(`playlists/${playlist.id}/songs/${fixture.songId}`, listener.token, 'PUT');
  assert.deepEqual((await request(`playlists/${playlist.id}`, listener.token)).songIds, [fixture.songId]);
  await request(`playlists/${playlist.id}`, other.token, 'GET', undefined, 404);
  await request(`playlists/${playlist.id}`, listener.token, 'PATCH', { name: '[TEST] Updated Bachs playlist' });
  assert.equal((await request(`playlists/${playlist.id}`, listener.token)).item.name, '[TEST] Updated Bachs playlist');
  await request(`playlists/${playlist.id}`, listener.token, 'DELETE');
  await request(`playlists/${playlist.id}`, listener.token, 'GET', undefined, 404);
  await pass('settings persisted without privilege escalation; favourites and playlist CRUD stayed isolated and functional');
} else if (phase === 'expiry') {
  const listener = await actor(fixture.accounts[0]);
  const row = fixture.confirmedPass;
  assert.ok(row);
  try {
    checked(await service.from('bachs_payment_passes').update({ paid_from: new Date(Date.now() - 86400_000).toISOString(), paid_through: new Date(Date.now() - 1000).toISOString() }).eq('checkout_reference', fixture.checkout.reference));
    assert.equal((await request('billing/subscription', listener.token)).entitled, false);
    if (fixture.songId) await request(`streams/${fixture.songId}/session`, listener.token, 'POST', {}, 402);
    await pass('expired monthly pass loses Premium and full playback immediately');
  } finally {
    checked(await service.from('bachs_payment_passes').update({ paid_from: row.paid_from, paid_through: row.paid_through }).eq('checkout_reference', fixture.checkout.reference));
  }
} else if (phase === 'cleanup') {
  if (fixture.songId) {
    const assets = checked(await service.from('song_assets').select('full_object_path,preview_object_path').eq('song_id', fixture.songId).maybeSingle());
    if (assets?.full_object_path) checked(await service.storage.from('song-audio').remove([assets.full_object_path]));
    if (assets?.preview_object_path) checked(await service.storage.from('song-previews').remove([assets.preview_object_path]));
    checked(await service.from('songs').delete().eq('id', fixture.songId));
  }
  if (fixture.sourcePath) checked(await service.storage.from('song-audio').remove([fixture.sourcePath]));
  const attempts = checked(await service.from('bachs_checkouts').select('provider_checkout_id,payment_id').in('user_id', fixture.accounts.map((account) => account.id)));
  const checkoutIds = attempts.map((item) => item.provider_checkout_id).filter(Boolean);
  const paymentIds = attempts.map((item) => item.payment_id).filter(Boolean);
  if (checkoutIds.length) checked(await service.from('bachs_webhook_events').delete().in('payload->data->>checkout_id', checkoutIds));
  if (paymentIds.length) checked(await service.from('bachs_webhook_events').delete().in('payload->data->>charge_id', paymentIds));
  for (const account of fixture.accounts) {
    checked(await service.from('users').delete().eq('id', account.id));
    checked(await service.auth.admin.deleteUser(account.id));
  }
  await writeFile('docs/bachs-e2e-status.json', JSON.stringify({ testedAt: new Date().toISOString(), environment: 'Bachs sandbox, local HTTP app, real Supabase', checks: fixture.checks, disposableAccountsRemoved: fixture.accounts.length, testAudioRemoved: !!fixture.songId }, null, 2) + '\n');
  await rm(file);
  console.log('Temporary accounts, passes and media removed.');
} else {
  throw new Error('Choose setup, checkout, failed, media, processor, paid, permissions, personal, expiry, or cleanup.');
}

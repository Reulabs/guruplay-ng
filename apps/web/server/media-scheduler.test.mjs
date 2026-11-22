import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../../workers/media-scheduler/index.mjs';
import processor from '../../../api/media-worker.mjs';

test('the media scheduler exposes health but rejects public job dispatch and unknown routes', async () => {
  const env = { MEDIA_WORKER_SECRET: 'test-dispatch-secret' };
  const health = await worker.fetch(new Request('https://worker.example/health'), env);
  assert.equal(health.status, 200);
  for (const token of ['', 'Bearer wrong']) {
    const response = await worker.fetch(new Request('https://worker.example/dispatch', { method: 'POST', headers: { Authorization: token } }), env);
    assert.equal(response.status, 401);
  }
  assert.equal((await worker.fetch(new Request('https://worker.example/dispatch'), env)).status, 404);
});

test('authorized and scheduled dispatch call only the fixed processor and preserve failure states', async (t) => {
  const env = { MEDIA_WORKER_SECRET: 'test-dispatch-secret' };
  let accepted = true, calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls += 1;
    assert.equal(url, 'https://www.guruplay.com.ng/api/media-worker');
    assert.equal(options.headers.Authorization, 'Bearer test-dispatch-secret');
    assert.equal(options.redirect, 'error');
    return Response.json({}, { status: accepted ? 202 : 503 });
  });
  const response = await worker.fetch(new Request('https://worker.example/dispatch?target=https://untrusted.example', {
    method: 'POST', headers: { Authorization: 'Bearer test-dispatch-secret' }, body: 'ignored',
  }), env);
  assert.equal(response.status, 202);
  const promises = [];
  worker.scheduled({}, env, { waitUntil(promise) { promises.push(promise); } });
  await Promise.all(promises); assert.equal(calls, 2);
  accepted = false;
  assert.equal((await worker.fetch(new Request('https://worker.example/dispatch', { method: 'POST', headers: { Authorization: 'Bearer test-dispatch-secret' } }), env)).status, 502);
});

test('the hosted processor cannot be triggered without the private dispatch secret', () => {
  const previous = process.env.MEDIA_WORKER_SECRET;
  process.env.MEDIA_WORKER_SECRET = 'test-dispatch-secret';
  try {
    const res = { statusCode: 0, setHeader() {}, end(value) { this.body = JSON.parse(value); } };
    processor({ method: 'POST', headers: { authorization: 'Bearer untrusted' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Audio processing authorization failed.');
  } finally {
    if (previous === undefined) delete process.env.MEDIA_WORKER_SECRET;
    else process.env.MEDIA_WORKER_SECRET = previous;
  }
});

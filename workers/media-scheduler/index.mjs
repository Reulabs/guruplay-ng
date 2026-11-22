const processorUrl = 'https://www.guruplay.com.ng/api/media-worker';

async function authorized(request, secret) {
  if (!secret) return false;
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(secret));
}

export async function dispatch(env) {
  if (!env.MEDIA_WORKER_SECRET) throw new Error('Media dispatch is not configured.');
  const response = await fetch(processorUrl, {
    method: 'POST', headers: { Authorization: `Bearer ${env.MEDIA_WORKER_SECRET}` },
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 202) throw new Error(`Media processor did not accept dispatch (${response.status}).`);
  console.info(JSON.stringify({ event: 'media-dispatch-accepted' }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({ status: 'ok', service: 'guruplay-media-scheduler' }, { headers: { 'cache-control': 'no-store' } });
    }
    if (url.pathname !== '/dispatch' || request.method !== 'POST') return Response.json({ error: 'Route not found.' }, { status: 404 });
    if (!await authorized(request, env.MEDIA_WORKER_SECRET)) return Response.json({ error: 'Dispatch authorization failed.' }, { status: 401 });
    try {
      await dispatch(env);
      return Response.json({ accepted: true }, { status: 202 });
    } catch {
      console.error(JSON.stringify({ event: 'media-dispatch-failed' }));
      return Response.json({ error: 'Audio processing is temporarily unavailable. The scheduled retry will try again.' }, { status: 502 });
    }
  },
  scheduled(controller, env, context) {
    context.waitUntil(dispatch(env));
  },
};

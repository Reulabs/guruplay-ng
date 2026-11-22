export async function dispatchMediaJob() {
  const endpoint = process.env.MEDIA_WORKER_URL;
  if (!endpoint || !process.env.MEDIA_WORKER_SECRET) return;
  try {
    const url = new URL('/dispatch', endpoint);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.port) throw new Error('Invalid worker endpoint.');
    const response = await fetch(url, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.MEDIA_WORKER_SECRET}` },
      redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 202) throw new Error('Worker did not accept dispatch.');
  } catch {
    console.warn(JSON.stringify({ event: 'media-dispatch-deferred', message: 'The durable job will be retried by the scheduled worker.' }));
  }
}

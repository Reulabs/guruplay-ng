import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { personalApi, preferences } from './personal-api.mjs';
import { rankRecommendations } from './recommendations.mjs';
import { checkoutCallbackUrl, findPaymentSubscription, matchesCheckout } from './billing.mjs';

const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(value));
};

const getConfig = () => {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY } = process.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error('Guruplay is temporarily unavailable. Please try again shortly.'), { status: 503 });
  }
  return { url: VITE_SUPABASE_URL, anon: VITE_SUPABASE_ANON_KEY, serviceKey: SUPABASE_SERVICE_ROLE_KEY, paystackKey: PAYSTACK_SECRET_KEY };
};

const createApiError = (status, message) => Object.assign(new Error(message), { status });

const readRawBody = async (req) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === 'string') return Buffer.from(req.rawBody);
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString();
    if (Buffer.byteLength(raw) > 32_768) throw createApiError(413, 'Request body is too large.');
  }
  return Buffer.from(raw);
};

const getBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRawBody(req);
  try { return raw.length ? JSON.parse(raw.toString('utf8')) : {}; }
  catch { throw createApiError(400, 'Send valid JSON.'); }
};

const safeReference = () => `guru-${Date.now()}-${randomUUID().replaceAll('-', '')}`;
const userClient = (config, token) => createClient(config.url, config.anon, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
});

async function requireUser(req, config, service) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw createApiError(401, 'Sign in to continue.');
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw createApiError(401, 'Your session has expired. Sign in again.');
  const { data: profile, error: profileError } = await service.from('users')
    .select('id,email,account_status').eq('id', data.user.id).maybeSingle();
  if (profileError) throw createApiError(503, 'Unable to verify account status.');
  if (!profile || profile.account_status !== 'active') throw createApiError(403, 'This account cannot stream music.');
  return { user: data.user, profile, db: userClient(config, token) };
}

export const hasEntitlement = (subscription, now = Date.now()) => {
  if (!subscription || !['active', 'non_renewing', 'attention'].includes(subscription.status)) return false;
  return new Date(subscription.paid_through).getTime() + 24 * 60 * 60 * 1000 >= now;
};

const paystackRequest = async (secret, route, body) => {
  const response = await fetch(`https://api.paystack.co${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== true) throw createApiError(502, 'Paystack could not complete the request. Try again shortly.');
  return payload.data;
};

async function ensureEntitlement(service, userId) {
  const { data, error } = await service.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw createApiError(503, 'Unable to check subscription status.');
  return data;
}

async function startCheckout(req, res, config, service, actor) {
  if (!config.paystackKey || !process.env.PAYSTACK_PLAN_CODE || !process.env.PAYSTACK_MONTHLY_AMOUNT || !process.env.PAYSTACK_CURRENCY) {
    throw createApiError(503, 'Monthly billing is not configured.');
  }
  if (hasEntitlement(await ensureEntitlement(service, actor.user.id))) {
    throw createApiError(409, 'Your subscription is already active. Manage your existing subscription instead.');
  }
  const reference = safeReference();
  const planCode = process.env.PAYSTACK_PLAN_CODE;
  const amount = Number(process.env.PAYSTACK_MONTHLY_AMOUNT);
  const currency = process.env.PAYSTACK_CURRENCY.toUpperCase();
  if (!/^sk_(test|live)_/.test(config.paystackKey)) throw createApiError(503, 'A Paystack secret key is required for billing.');
  const callbackUrl = checkoutCallbackUrl(process.env.PUBLIC_APP_URL, config.paystackKey, reference, req.headers.origin);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) throw createApiError(503, 'Billing configuration is invalid.');
  const { error } = await service.from('billing_checkout_attempts').insert({
    reference, user_id: actor.user.id, plan_code: planCode, expected_amount: amount, currency,
  });
  if (error) throw createApiError(503, 'Unable to start checkout. Try again shortly.');
  const transaction = await paystackRequest(config.paystackKey, '/transaction/initialize', {
    email: actor.user.email,
    amount,
    currency,
    plan: planCode,
    reference,
    callback_url: callbackUrl,
    metadata: { user_id: actor.user.id, purpose: 'guruplay_monthly_subscription' },
  });
  json(res, 200, { authorizationUrl: transaction.authorization_url, reference });
}

async function verifyCheckout(req, res, config, service, actor, reference) {
  if (!config.paystackKey || !reference || !/^[A-Za-z0-9._=-]{1,100}$/.test(reference)) throw createApiError(400, 'A valid payment reference is required.');
  const { data: checkout, error } = await service.from('billing_checkout_attempts').select('*').eq('reference', reference).eq('user_id', actor.user.id).maybeSingle();
  if (error) throw createApiError(503, 'We couldn’t look up this payment. Please try again shortly.');
  if (!checkout) throw createApiError(404, 'We couldn’t match this payment to your account. Sign in with the account used at checkout, or contact support if you were charged.');
  if (checkout.status === 'verified') return json(res, 200, { status: 'verified' });
  const transaction = await paystackRequest(config.paystackKey, `/transaction/verify/${encodeURIComponent(reference)}`);
  if (!matchesCheckout(transaction, checkout, actor.user.email)) {
    await service.from('billing_checkout_attempts').update({ status: 'failed' }).eq('reference', reference).neq('status', 'verified');
    throw createApiError(402, 'Payment could not be verified for this account and plan.');
  }
  await applyVerifiedTransaction(service, checkout, transaction, config);
  return json(res, 200, { status: 'verified' });
}

async function applyVerifiedTransaction(service, checkout, transaction, config) {
  const paidAt = new Date(transaction.paid_at || Date.now());
  const paidThrough = new Date(paidAt);
  paidThrough.setUTCMonth(paidThrough.getUTCMonth() + 1);
  let providerSubscription = transaction.subscription;
  if (!providerSubscription?.subscription_code && Number.isSafeInteger(transaction.customer?.id) && Number.isSafeInteger(transaction.plan_object?.id)) {
    const subscriptions = await paystackRequest(config.paystackKey,
      `/subscription?customer=${transaction.customer.id}&plan=${transaction.plan_object.id}&perPage=100`);
    providerSubscription = findPaymentSubscription(Array.isArray(subscriptions) ? subscriptions : [], transaction, checkout.plan_code);
  }
  if (!providerSubscription?.subscription_code) {
    throw createApiError(503, 'Payment was received. Your recurring subscription is still being confirmed; please check again shortly.');
  }
  const subscriptionCode = providerSubscription.subscription_code;
  const providerPaidThrough = providerSubscription.next_payment_date || paidThrough.toISOString();
  const { data: currentSubscription, error: currentSubscriptionError } = await service.from('subscriptions').select('status,subscription_code').eq('user_id', checkout.user_id).maybeSingle();
  if (currentSubscriptionError) throw createApiError(503, 'Unable to check the current subscription.');
  const status = currentSubscription?.subscription_code === subscriptionCode && ['non_renewing', 'cancelled'].includes(currentSubscription.status)
    ? 'non_renewing'
    : 'active';
  const { error } = await service.from('subscriptions').upsert({
    user_id: checkout.user_id,
    customer_code: transaction.customer?.customer_code || null,
    subscription_code: subscriptionCode,
    plan_code: checkout.plan_code,
    status,
    paid_through: providerPaidThrough,
    provider_updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw createApiError(503, 'Payment was verified but entitlement could not be recorded yet.');
  const { error: updateCheckoutError } = await service.from('billing_checkout_attempts').update({
    status: 'verified', paystack_transaction_id: transaction.id, verified_at: new Date().toISOString(),
  }).eq('reference', checkout.reference);
  if (updateCheckoutError) throw createApiError(503, 'Payment entitlement was recorded but checkout status needs reconciliation.');
}

async function processPaystackEvent(event, config, service) {
  const payload = event.data;
  if (event.event === 'charge.success' && typeof payload.reference === 'string') {
    const { data: checkout, error } = await service.from('billing_checkout_attempts').select('*').eq('reference', payload.reference).maybeSingle();
    if (error) throw createApiError(503, 'Unable to match payment to checkout.');
    const verified = await paystackRequest(config.paystackKey, `/transaction/verify/${encodeURIComponent(payload.reference)}`);
    if (checkout) {
      const { data: account, error: accountError } = await service.from('users').select('email').eq('id', checkout.user_id).single();
      if (accountError) throw createApiError(503, 'Unable to match payment to the account.');
      if (!matchesCheckout(verified, checkout, account?.email)) {
        throw createApiError(400, 'Verified payment does not match the checkout.');
      }
      return await applyVerifiedTransaction(service, checkout, verified, config);
    }
    const subscriptionCode = payload.subscription?.subscription_code || verified.subscription?.subscription_code;
    const { data: subscription, error: subscriptionError } = await service.from('subscriptions').select('*')
      .eq('subscription_code', subscriptionCode || '').maybeSingle();
    if (subscriptionError || !subscription) return;
    const amount = Number(process.env.PAYSTACK_MONTHLY_AMOUNT);
    const currency = process.env.PAYSTACK_CURRENCY?.toUpperCase();
    if (verified.status !== 'success' || verified.amount !== amount || verified.currency !== currency ||
        verified.customer?.customer_code !== subscription.customer_code) throw createApiError(400, 'Renewal payment does not match the subscription.');
    const paidThrough = verified.subscription?.next_payment_date || payload.subscription?.next_payment_date;
    const fallback = new Date(verified.paid_at || Date.now());
    fallback.setUTCMonth(fallback.getUTCMonth() + 1);
    const { error: updateError } = await service.from('subscriptions').update({
      status: 'active', paid_through: paidThrough || fallback.toISOString(), provider_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('user_id', subscription.user_id);
    if (updateError) throw createApiError(503, 'Renewal was verified but access could not be updated.');
    return;
  }
  const providerCode = payload.subscription?.subscription_code || payload.subscription_code;
  if (!providerCode) return;
  const { data: subscription, error } = await service.from('subscriptions').select('*').eq('subscription_code', providerCode).maybeSingle();
  if (error) throw createApiError(503, 'Unable to update subscription status.');
  if (!subscription) return;
  const now = Date.now();
  let status = subscription.status;
  if (event.event === 'subscription.not_renew') status = 'non_renewing';
  if (event.event === 'invoice.payment_failed') status = 'attention';
  if (event.event === 'subscription.disable') status = Date.parse(subscription.paid_through) > now ? 'non_renewing' : 'cancelled';
  if (event.event === 'subscription.create') status = 'active';
  if (status !== subscription.status) {
    const { error: updateError } = await service.from('subscriptions').update({ status, provider_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', subscription.user_id);
    if (updateError) throw createApiError(503, 'Subscription status could not be updated.');
  }
}

export function verifyPaystackSignature(raw, signature, secret) {
  if (!raw || !signature || !secret) return false;
  const expected = createHmac('sha512', secret).update(raw).digest();
  let provided;
  try { provided = Buffer.from(signature, 'hex'); } catch { return false; }
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function receiveWebhook(req, res, config, service) {
  if (!config.paystackKey) throw createApiError(503, 'Billing webhook is not configured.');
  const raw = await readRawBody(req);
  if (!verifyPaystackSignature(raw, req.headers['x-paystack-signature'], config.paystackKey)) throw createApiError(401, 'Invalid webhook signature.');
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { throw createApiError(400, 'Invalid webhook payload.'); }
  if (typeof event.event !== 'string' || !event.data || typeof event.data !== 'object') throw createApiError(400, 'Invalid webhook payload.');
  const reference = event.data.reference || event.data.subscription?.reference || '';
  const identity = `${event.event}:${reference}:${event.data.id || event.data.subscription_code || ''}`;
  const eventKey = createHash('sha256').update(identity).digest('hex');
  const { error } = await service.from('paystack_webhook_events').upsert({
    event_key: eventKey, event_type: event.event, payload: event, status: 'received',
  }, { onConflict: 'event_key', ignoreDuplicates: true });
  if (error) throw createApiError(503, 'Webhook could not be durably recorded.');
  try {
    await processPaystackEvent(event, config, service);
    await service.from('paystack_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), attempts: 1 }).eq('event_key', eventKey);
  } catch (processingError) {
    await service.from('paystack_webhook_events').update({ status: 'failed', attempts: 1, last_error: String(processingError?.message || 'Webhook processing failed').slice(0, 1000) }).eq('event_key', eventKey);
    throw createApiError(503, 'Payment event could not be processed. Paystack should retry it.');
  }
  json(res, 200, { received: true });
}

async function reconcilePayments(req, res, config, service) {
  const supplied = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!process.env.CRON_SECRET || supplied !== process.env.CRON_SECRET) throw createApiError(401, 'Reconciliation authorization failed.');
  if (!config.paystackKey) throw createApiError(503, 'Billing reconciliation is not configured.');
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: attempts, error: attemptsError } = await service.from('billing_checkout_attempts').select('*')
    .eq('status', 'initialized').lt('created_at', cutoff).order('created_at', { ascending: true }).limit(50);
  if (attemptsError) throw createApiError(503, 'Unable to load pending checkouts.');
  let verifiedCount = 0;
  for (const checkout of attempts || []) {
    try {
      const transaction = await paystackRequest(config.paystackKey, `/transaction/verify/${encodeURIComponent(checkout.reference)}`);
      if (transaction.status !== 'success') continue;
      const { data: account } = await service.from('users').select('email').eq('id', checkout.user_id).maybeSingle();
      if (!matchesCheckout(transaction, checkout, account?.email)) continue;
      await applyVerifiedTransaction(service, checkout, transaction, config);
      verifiedCount += 1;
    } catch {
      // The next scheduled pass can safely reconcile transient provider failures.
    }
  }
  const staleAfter = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: staleSubscriptions, error: subscriptionsError } = await service.from('subscriptions').select('user_id,subscription_code,status,paid_through')
    .lt('provider_updated_at', staleAfter).not('subscription_code', 'is', null).limit(100);
  if (subscriptionsError) throw createApiError(503, 'Unable to load subscriptions for reconciliation.');
  let refreshedCount = 0;
  for (const subscription of staleSubscriptions || []) {
    try {
      const current = await paystackRequest(config.paystackKey, `/subscription/${encodeURIComponent(subscription.subscription_code)}`);
      const nextStatus = current.status === 'active' ? 'active' : current.status === 'non-renewing' ? 'non_renewing'
        : current.status === 'attention' ? 'attention' : current.status === 'cancelled' || current.status === 'completed' ? current.status : subscription.status;
      const nextPaidThrough = current.next_payment_date || subscription.paid_through;
      const { error } = await service.from('subscriptions').update({ status: nextStatus, paid_through: nextPaidThrough, provider_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', subscription.user_id);
      if (!error) refreshedCount += 1;
    } catch {
      // A provider outage leaves the last confirmed paid period authoritative.
    }
  }
  const { error: aggregateError } = await service.rpc('refresh_music_aggregates');
  if (aggregateError) throw createApiError(503, 'Payment reconciliation completed but play aggregates could not be refreshed.');
  json(res, 200, { verifiedCheckouts: verifiedCount, refreshedSubscriptions: refreshedCount });
}

async function createStreamSession(res, service, actor, songId) {
  if (!/^[0-9a-f-]{36}$/i.test(songId)) throw createApiError(400, 'A valid song ID is required.');
  const subscription = await ensureEntitlement(service, actor.user.id);
  if (!hasEntitlement(subscription)) throw createApiError(402, 'An active Guruplay subscription is required for full playback.');
  const { data: song, error: songError } = await service.from('songs').select('id,approval_status,processing_status').eq('id', songId).maybeSingle();
  if (songError) throw createApiError(503, 'Unable to check song availability.');
  if (!song || song.approval_status !== 'approved' || song.processing_status !== 'ready') throw createApiError(404, 'This song is unavailable for full playback.');
  const { data: asset, error: assetError } = await service.from('song_assets').select('full_object_path').eq('song_id', songId).maybeSingle();
  if (assetError || !asset?.full_object_path) throw createApiError(404, 'This song is unavailable for full playback.');
  const createdAt = Date.now();
  const { count: recentSessionCount, error: limitError } = await service.from('stream_sessions').select('id', { count: 'exact', head: true })
    .eq('user_id', actor.user.id).gte('created_at', new Date(createdAt - 60_000).toISOString());
  if (limitError) throw createApiError(503, 'Unable to authorize playback right now.');
  if ((recentSessionCount || 0) >= 30) throw createApiError(429, 'Too many playback requests. Wait a moment and try again.');
  const expiresAt = new Date(createdAt + 5 * 60_000).toISOString();
  const { data: signed, error: signError } = await service.storage.from('song-audio').createSignedUrl(asset.full_object_path, 300);
  if (signError || !signed?.signedUrl) throw createApiError(503, 'Full audio is temporarily unavailable.');
  const { data: session, error: sessionError } = await service.from('stream_sessions').insert({
    user_id: actor.user.id, song_id: songId, expires_at: expiresAt,
  }).select('id').single();
  if (sessionError) throw createApiError(503, 'Unable to start playback right now.');
  json(res, 200, { id: session.id, songId, url: signed.signedUrl, expiresAt, access: 'full' });
}

async function recordEvents(req, res, service, actor) {
  const body = await getBody(req);
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 100) throw createApiError(400, 'Send between 1 and 100 playback events.');
  const allowed = new Set(['impression','preview_start','preview_complete','full_play_start','heartbeat','completion','skip','like','unlike','dislike']);
  const rows = body.events.map((event) => {
    if (!event || !/^[0-9a-f-]{36}$/i.test(event.eventId) || !/^[0-9a-f-]{36}$/i.test(event.songId) ||
        !allowed.has(event.eventType) || !Number.isInteger(event.positionSeconds) || event.positionSeconds < 0 || event.positionSeconds > 86400 ||
        typeof event.clientOccurredAt !== 'string' || !Number.isFinite(Date.parse(event.clientOccurredAt))) {
      throw createApiError(400, 'One or more playback events are invalid.');
    }
    if (['full_play_start','heartbeat','completion'].includes(event.eventType) && !event.streamSessionId) {
      throw createApiError(400, 'Full playback events require a playback session.');
    }
    if (!actor && (!['impression','preview_start','preview_complete','skip'].includes(event.eventType) || event.streamSessionId)) {
      throw createApiError(401, 'Sign in to record full playback activity.');
    }
    return {
      event_id: event.eventId, user_id: actor?.user.id || null,
      anonymous_id: actor ? null : event.anonymousId,
      song_id: event.songId, stream_session_id: event.streamSessionId || null,
      event_type: event.eventType, position_seconds: event.positionSeconds,
      client_occurred_at: event.clientOccurredAt,
    };
  });
  if (actor && (await preferences(service, actor.user.id)).private_session) return json(res, 202, { accepted: 0, privateSession: true });
  const fullEvents = rows.filter((event) => event.stream_session_id);
  if (fullEvents.length) {
    if (!actor) throw createApiError(401, 'Sign in to record full playback activity.');
    const sessionIds = [...new Set(fullEvents.map((event) => event.stream_session_id))];
    const { data: sessions, error } = await service.from('stream_sessions').select('id,song_id').eq('user_id', actor.user.id)
      .in('id', sessionIds).gt('expires_at', new Date().toISOString());
    if (error || sessions?.length !== sessionIds.length || fullEvents.some((event) => !sessions?.some((session) => session.id === event.stream_session_id && session.song_id === event.song_id))) throw createApiError(403, 'Playback session is invalid or expired.');
  }
  const { error } = await service.from('playback_events').upsert(rows, { onConflict: 'event_id', ignoreDuplicates: true });
  if (error) throw createApiError(503, 'Playback events could not be recorded.');
  json(res, 202, { accepted: rows.length });
}

export default async function musicApi(req, res) {
  try {
    const config = getConfig();
    const service = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);

    if (path[0] === 'health' && req.method === 'GET') return json(res, 200, { status: 'ok' });
    if (path[0] === 'webhooks' && path[1] === 'paystack' && req.method === 'POST') return await receiveWebhook(req, res, config, service);
    if (path[0] === 'internal' && path[1] === 'reconcile' && req.method === 'GET') return await reconcilePayments(req, res, config, service);

    if (path[0] === 'playback' && path[1] === 'events' && req.method === 'POST') {
      const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      const actor = token ? await requireUser(req, config, service) : null;
      return await recordEvents(req, res, service, actor);
    }

    if (path[0] === 'media' && path[1] === 'songs' && path[2] === 'upload' && req.method === 'POST') {
      const actor = await requireUser(req, config, service);
      const body = await getBody(req);
      if (typeof body.audioPath !== 'string' || !body.audioPath.startsWith(`${actor.user.id}/`) || body.audioPath.includes('..')) throw createApiError(400, 'Invalid audio upload path.');
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160 || typeof body.genre !== 'string' || body.genre.length > 100) throw createApiError(400, 'Song metadata is invalid.');
      const { data: profile } = await service.from('users').select('user_type').eq('id', actor.user.id).maybeSingle();
      const { data: artist } = await service.from('artist_profiles').select('artist_name,approval_status').eq('user_id', actor.user.id).maybeSingle();
      const isArtist = profile?.user_type === 'artist' && artist?.approval_status === 'approved';
      const isAdmin = profile?.user_type === 'admin';
      if (!isArtist && !isAdmin) throw createApiError(403, 'Only approved artists and admins can upload songs.');
      const title = body.title.trim();
      const genre = body.genre.trim();
      const artistName = typeof body.artist === 'string' && body.artist.trim() ? body.artist.trim().slice(0, 160) : artist?.artist_name || actor.user.email;
      if (!genre) throw createApiError(400, 'Choose a genre for this song.');
      const uploadId = body.uploadId === undefined ? randomUUID() : body.uploadId;
      if (typeof uploadId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId)) throw createApiError(400, 'Invalid upload identifier.');
      if (body.uploadId !== undefined) {
        const { data: previous, error: previousError } = await service.from('songs').select('id,user_id,title,artist,genre,processing_status').eq('id', uploadId).maybeSingle();
        if (previousError) throw createApiError(503, 'Unable to check the upload. Try again shortly.');
        if (previous) {
          if (previous.user_id !== actor.user.id) throw createApiError(404, 'Upload not found.');
          if (previous.title !== title || previous.artist !== artistName || previous.genre !== genre) throw createApiError(409, 'This upload already exists with different details. Check My uploads.');
          const { data: job, error: jobError } = await service.from('media_jobs').select('id').eq('song_id', uploadId).maybeSingle();
          if (jobError || !job) throw createApiError(409, 'This upload is still being registered. Try again shortly.');
          return json(res, 202, { id: previous.id, processingStatus: previous.processing_status });
        }
      }
      const { data: object, error: objectError } = await service.storage.from('song-audio').list(actor.user.id, { search: body.audioPath.split('/').at(-1), limit: 1 });
      if (objectError || !object?.length || object[0].name !== body.audioPath.split('/').at(-1)) throw createApiError(400, 'Uploaded audio was not found.');
      const { data: song, error } = await service.from('songs').insert({
        id: uploadId, user_id: actor.user.id, title, artist: artistName,
        genre, cover_url: typeof body.coverUrl === 'string' ? body.coverUrl : '',
        audio_url: '', approval_status: isAdmin ? 'approved' : 'pending', processing_status: 'uploaded',
      }).select('id').single();
      if (error || !song) throw createApiError(503, 'Unable to create the song record.');
      const { error: assetError } = await service.from('song_assets').insert({ song_id: song.id, full_object_path: body.audioPath });
      if (assetError) {
        await service.from('songs').delete().eq('id', song.id);
        throw createApiError(503, 'Unable to register the audio asset.');
      }
      const { error: jobError } = await service.from('media_jobs').upsert({ song_id: song.id }, { onConflict: 'song_id,job_type', ignoreDuplicates: true });
      if (jobError) {
        await service.from('songs').delete().eq('id', song.id);
        await service.storage.from('song-audio').remove([body.audioPath]);
        throw createApiError(503, 'Song upload was rolled back because processing could not be queued.');
      }
      return json(res, 202, { id: song.id, processingStatus: 'uploaded' });
    }

    if (['me','library','playlists','support'].includes(path[0])) {
      const actor = await requireUser(req, config, service);
      return json(res, 200, await personalApi({ service, actor, path, method: req.method, body: ['GET','DELETE'].includes(req.method) ? {} : await getBody(req) }));
    }

    if (path[0] === 'recommendations' && req.method === 'GET') {
      const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      let actor = token ? await requireUser(req, config, service) : null;
      if (actor && (await preferences(service, actor.user.id)).private_session) actor = null;
      if (actor) {
        const { data: cached, error: cacheError } = await service.from('recommendation_snapshots').select('recommendations,expires_at').eq('user_id', actor.user.id).maybeSingle();
        if (cacheError) throw createApiError(503, 'Recommendations are temporarily unavailable.');
        if (cached && Date.parse(cached.expires_at) > Date.now()) return json(res, 200, { items: cached.recommendations, generatedAt: new Date().toISOString() });
      }
      const { data: songs, error: songsError } = await service.from('public_catalog').select('*').order('created_at', { ascending: false }).limit(500);
      if (songsError) throw createApiError(503, 'Recommendations are temporarily unavailable.');
      let events = [];
      if (actor) {
        const { data, error } = await service.from('playback_events').select('song_id,event_type,received_at')
          .eq('user_id', actor.user.id).order('received_at', { ascending: false }).limit(300);
        if (error) throw createApiError(503, 'Recommendations are temporarily unavailable.');
        events = data || [];
      }
      const items = rankRecommendations(songs || [], events).map((item) => ({
        ...item, track: songs.find((song) => song.id === item.songId),
      }));
      if (actor) {
        const { error } = await service.from('recommendation_snapshots').upsert({
          user_id: actor.user.id, recommendations: items,
          generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        }, { onConflict: 'user_id' });
        if (error) throw createApiError(503, 'Recommendations could not be cached.');
      }
      return json(res, 200, { items, generatedAt: new Date().toISOString() });
    }

    if (path[0] === 'catalog' && path[1] === 'search' && req.method === 'GET') {
      const query = (url.searchParams.get('q') || '').trim().slice(0, 80);
      const page = Math.max(1, Math.min(1000, Number(url.searchParams.get('page')) || 1));
      if (query.length < 2) return json(res, 200, { items: [], page, pageSize: 20, hasMore: false });
      const { data, error } = await service.rpc('search_public_catalog', { search_query: query, page_number: page });
      if (error) throw createApiError(503, 'Search is temporarily unavailable.');
      return json(res, 200, { items: data || [], page, pageSize: 20, hasMore: (data || []).length === 20 });
    }

    const actor = await requireUser(req, config, service);
    if (path[0] === 'admin' && path[1] === 'songs' && path[2] && path[3] === 'preview' && req.method === 'GET') {
      const { data: profile } = await service.from('users').select('user_type').eq('id', actor.user.id).maybeSingle();
      if (profile?.user_type !== 'admin') throw createApiError(403, 'Administrator access is required.');
      const { data: asset, error } = await service.from('song_assets').select('full_object_path').eq('song_id', path[2]).maybeSingle();
      if (error || !asset?.full_object_path) throw createApiError(404, 'Audio is not available for review yet.');
      const { data: signed, error: signError } = await service.storage.from('song-audio').createSignedUrl(asset.full_object_path, 300);
      if (signError || !signed?.signedUrl) throw createApiError(503, 'Audio preview is temporarily unavailable.');
      return json(res, 200, { url: signed.signedUrl });
    }
    if (path[0] === 'admin' && path[1] === 'songs' && path[2] && req.method === 'DELETE') {
      const { data: profile } = await service.from('users').select('user_type').eq('id', actor.user.id).maybeSingle();
      if (profile?.user_type !== 'admin') throw createApiError(403, 'Administrator access is required.');
      const { data: asset, error: assetError } = await service.from('song_assets').select('full_object_path,preview_object_path').eq('song_id', path[2]).maybeSingle();
      if (assetError) throw createApiError(503, 'Unable to load song assets.');
      const { error: deleteError } = await service.from('songs').delete().eq('id', path[2]);
      if (deleteError) throw createApiError(503, 'Unable to delete the song.');
      if (asset?.full_object_path) await service.storage.from('song-audio').remove([asset.full_object_path]);
      if (asset?.preview_object_path) await service.storage.from('song-previews').remove([asset.preview_object_path]);
      return json(res, 200, { deleted: true });
    }
    if (path[0] === 'billing' && path[1] === 'checkout' && req.method === 'POST') return await startCheckout(req, res, config, service, actor);
    if (path[0] === 'billing' && path[1] === 'verify' && req.method === 'POST') {
      const body = await getBody(req);
      return await verifyCheckout(req, res, config, service, actor, body.reference);
    }
    if (path[0] === 'billing' && path[1] === 'subscription' && req.method === 'GET') {
      const subscription = await ensureEntitlement(service, actor.user.id);
      return json(res, 200, { entitled: hasEntitlement(subscription), status: subscription?.status || 'inactive', paidThrough: subscription?.paid_through || null,
        graceEndsAt: subscription?.paid_through ? new Date(new Date(subscription.paid_through).getTime() + 24 * 60 * 60_000).toISOString() : null });
    }
    if (path[0] === 'billing' && path[1] === 'manage' && req.method === 'POST') {
      if (!config.paystackKey) throw createApiError(503, 'Billing management is not configured.');
      const subscription = await ensureEntitlement(service, actor.user.id);
      if (!subscription?.subscription_code || !subscription.customer_code) throw createApiError(404, 'No Paystack subscription is available to manage.');
      const data = await paystackRequest(config.paystackKey, `/subscription/${encodeURIComponent(subscription.subscription_code)}/manage/email`, {});
      return json(res, 200, { message: data.message || 'Management link sent to your email.' });
    }
    if (path[0] === 'streams' && path[1] && path[2] === 'session' && req.method === 'POST') return await createStreamSession(res, service, actor, path[1]);
    throw createApiError(404, 'Music API route not found.');
  } catch (error) {
    if (res.headersSent) return;
    json(res, Number.isInteger(error?.status) ? error.status : 500,
      { error: Number.isInteger(error?.status) ? error.message : 'An unexpected music service error occurred.' });
  }
}

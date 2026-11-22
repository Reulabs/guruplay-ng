import { createHmac, timingSafeEqual } from 'node:crypto';

export const monthlyPass = Object.freeze({ amount: '1000.00', currency: 'NGN', code: 'guruplay-monthly-pass-v1' });
export const billingError = (status, message) => Object.assign(new Error(message), { status });

export function bachsConfig(env = process.env) {
  const environment = env.BACHS_ENVIRONMENT || 'live';
  if (!['sandbox', 'live'].includes(environment)) throw billingError(503, 'Payments are temporarily unavailable. Please try again shortly.');
  const key = environment === 'sandbox'
    ? env.BACHS_SANDBOX_SECRET_KEY
    : env.BACHS_SECRET_KEY || env.BACHS_SECRETE_KEY || env.BACHS_LIVE_SECRETE_KEY;
  if (!key?.startsWith(environment === 'sandbox' ? 'sk_sandbox_' : 'sk_live_')) {
    throw billingError(503, 'Payments are temporarily unavailable. Please try again shortly.');
  }
  return {
    environment, key,
    baseUrl: environment === 'sandbox' ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io',
    webhookSecret: environment === 'sandbox' ? env.BACHS_SANDBOX_WEBHOOK_SECRET : env.BACHS_WEBHOOK_SECRET,
    checkoutHost: environment === 'sandbox' ? 'sandbox-checkout.bachs.io' : 'checkout.bachs.io',
  };
}

export async function bachsRequest(config, route, { body, idempotencyKey } = {}, retry = 0) {
  let response;
  try {
    response = await fetch(`${config.baseUrl}/v1${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw billingError(502, 'We couldn’t reach the payment service. Please try again shortly.');
  }
  const result = await response.json().catch(() => null);
  if (response.status === 409 && result?.error_code === 'IDEMPOTENCY_IN_PROGRESS' && idempotencyKey) {
    if (retry >= 3) throw billingError(409, 'Your checkout is still being prepared. Please try again shortly.');
    await new Promise((resolve) => setTimeout(resolve, 250 * (retry + 1)));
    return bachsRequest(config, route, { body, idempotencyKey }, retry + 1);
  }
  if (!response.ok || !result || typeof result !== 'object' || Array.isArray(result)) {
    if (['ACCOUNT_NOT_ACTIVATED', 'FORBIDDEN'].includes(result?.error_code)) {
      throw Object.assign(billingError(503, 'Checkout is not available yet. Please check back later or contact Guruplay support.'), { providerStatus: response.status });
    }
    throw Object.assign(billingError(502, 'We couldn’t complete the payment request. Please try again shortly.'), { providerStatus: response.status });
  }
  return result;
}

export function checkoutUrl(value, config) {
  let url;
  try { url = new URL(value); } catch { throw billingError(502, 'We couldn’t open checkout. Please try again shortly.'); }
  if (url.protocol !== 'https:' || url.hostname !== config.checkoutHost || url.username || url.password || url.port) {
    throw billingError(502, 'We couldn’t open checkout. Please try again shortly.');
  }
  return url.href;
}

export function decimalSubunits(value) {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function matchesBachsPayment(session, payment, checkout) {
  const email = checkout.customer_email.toLowerCase();
  return session.checkout_id === checkout.provider_checkout_id &&
    session.reference === checkout.reference && session.status === 'completed' &&
    session.payment_status === 'succeeded' && !session.recurring &&
    decimalSubunits(session.amount) === checkout.expected_amount && session.currency === checkout.currency &&
    session.metadata?.user_id === checkout.user_id && session.metadata?.purpose === monthlyPass.code &&
    session.metadata?.environment === checkout.environment &&
    session.customer?.email?.toLowerCase() === email &&
    payment.payment_id === session.charge?.payment_id && payment.checkout_id === session.checkout_id &&
    payment.reference === checkout.reference && payment.status === 'succeeded' && !payment.subscription_id &&
    decimalSubunits(payment.amount) === checkout.expected_amount && payment.currency === checkout.currency &&
    payment.customer?.email?.toLowerCase() === email &&
    Number.isFinite(Date.parse(payment.completed_at)) &&
    Date.parse(payment.completed_at) >= Date.parse(checkout.created_at) - 60_000 &&
    Date.parse(payment.completed_at) <= Date.now() + 60_000;
}

export function verifyBachsSignature(raw, headers, secret, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || !secret) return false;
  const v2 = headers['x-bachs-signature-v2'];
  let timestamp;
  let signatures;
  if (typeof v2 === 'string') {
    const parts = v2.split(',').map((part) => part.trim().split('='));
    const timestamps = parts.filter(([key]) => key === 't');
    if (timestamps.length !== 1) return false;
    timestamp = timestamps[0][1];
    signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  } else {
    timestamp = headers['x-bachs-timestamp'];
    signatures = [headers['x-bachs-signature']];
  }
  if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest();
  return signatures.some((signature) => typeof signature === 'string' && /^[a-f\d]{64}$/i.test(signature) &&
    timingSafeEqual(expected, Buffer.from(signature, 'hex')));
}

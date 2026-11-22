import { randomUUID } from 'node:crypto';
import { checkoutCallbackUrl } from './billing.mjs';
import { bachsConfig, bachsRequest, billingError, checkoutUrl, matchesBachsPayment, monthlyPass, verifyBachsSignature } from './bachs.mjs';

const referencePattern = /^[A-Za-z0-9._=-]{1,100}$/;

export async function startBachsCheckout(req, service, actor) {
  const config = bachsConfig();
  const reference = `guru-${randomUUID()}`;
  const successUrl = checkoutCallbackUrl(process.env.PUBLIC_APP_URL, config.key, reference, req.headers.origin);
  if (!successUrl.startsWith('https:')) throw billingError(503, 'Checkout is temporarily unavailable. Please try again shortly.');
  const cancelUrl = new URL('/subscription?cancelled=1', successUrl).href;
  const request = {
    pricing: { amount: monthlyPass.amount, currency: monthlyPass.currency, price_type: 'fixed' },
    customer: { email: actor.user.email },
    reference, success_url: successUrl, cancel_url: cancelUrl,
    billing_currency: monthlyPass.currency, payment_method_types: ['NGN_CARD', 'NGN_BANK_TRANSFER'],
    metadata: { user_id: actor.user.id, purpose: monthlyPass.code, environment: config.environment },
  };
  const { data: attempts, error } = await service.rpc('begin_bachs_checkout', {
    p_reference: reference, p_user_id: actor.user.id, p_environment: config.environment,
    p_email: actor.user.email, p_request: request,
  });
  if (error?.code === 'P0001') throw billingError(409, 'Your listening access is already active.');
  if (error || !attempts?.[0]) throw billingError(503, 'We couldn’t start checkout. Please try again shortly.');
  const checkout = attempts[0];
  if (checkout.checkout_url && checkout.provider_checkout_id) {
    const current = await bachsRequest(config, `/checkout-sessions/${encodeURIComponent(checkout.provider_checkout_id)}`);
    if (current.status === 'completed') {
      await confirmBachsCheckout(service, checkout, config);
      throw billingError(409, 'Your payment was confirmed. Refresh to see your listening access.');
    }
    if (['expired', 'cancelled'].includes(current.status)) {
      const { error: closeError } = await service.from('bachs_checkouts').update({ status: current.status })
        .eq('reference', checkout.reference).eq('status', 'initialized');
      if (closeError) throw billingError(503, 'We couldn’t check your previous checkout. Please try again shortly.');
      return startBachsCheckout(req, service, actor);
    }
    if (current.status !== 'open' || Date.parse(checkout.expires_at) <= Date.now()) throw billingError(409, 'Your previous checkout is still being checked. Please try again shortly.');
    return { authorizationUrl: checkoutUrl(checkout.checkout_url, config), reference: checkout.reference };
  }
  if (Date.now() - Date.parse(checkout.created_at) > 23 * 3600_000) {
    throw billingError(409, 'We’re still checking a previous checkout. Contact support before paying again.');
  }
  let session;
  try {
    session = await bachsRequest(config, '/checkout-sessions', { body: checkout.request_body, idempotencyKey: checkout.reference });
  } catch (error) {
    if ([400, 422].includes(error.providerStatus)) {
      await service.from('bachs_checkouts').update({ status: 'cancelled' }).eq('reference', checkout.reference).is('provider_checkout_id', null);
    }
    throw error;
  }
  const authorizationUrl = checkoutUrl(session.checkout_url, config);
  if (typeof session.checkout_id !== 'string' || !/^chk_[A-Za-z0-9_-]{1,120}$/.test(session.checkout_id) ||
      session.reference !== checkout.reference || !Number.isFinite(Date.parse(session.expires_at))) {
    throw billingError(502, 'We couldn’t open checkout. Please try again shortly.');
  }
  const { error: saveError } = await service.from('bachs_checkouts').update({
    provider_checkout_id: session.checkout_id, checkout_url: authorizationUrl, expires_at: session.expires_at,
  }).eq('reference', checkout.reference);
  if (saveError) throw billingError(503, 'Your checkout is being prepared. Please try again shortly.');
  if (Date.parse(session.expires_at) <= Date.now()) throw billingError(409, 'This checkout has ended. Please try again.');
  return { authorizationUrl, reference: checkout.reference };
}

export async function confirmBachsCheckout(service, checkout, config = bachsConfig()) {
  if (checkout.environment !== config.environment) throw billingError(404, 'This payment is not available in this environment.');
  if (checkout.status === 'refunded') throw billingError(409, 'This payment was refunded. Contact support if you need help.');
  if (!checkout.provider_checkout_id) throw billingError(409, 'Your checkout is still being prepared. Please try again shortly.');
  const session = await bachsRequest(config, `/checkout-sessions/${encodeURIComponent(checkout.provider_checkout_id)}`);
  if (['expired', 'cancelled'].includes(session.status) && checkout.status !== 'verified') {
    const { error } = await service.from('bachs_checkouts').update({ status: session.status }).eq('reference', checkout.reference).neq('status', 'verified');
    if (error) throw billingError(503, 'We couldn’t update your checkout. Please try again shortly.');
    throw billingError(409, 'This checkout has ended. You can start a new checkout.');
  }
  if (!session.charge?.payment_id) throw billingError(409, 'Payment has not been confirmed yet. If you paid, check again shortly.');
  const payment = await bachsRequest(config, `/payments/${encodeURIComponent(session.charge.payment_id)}`);
  if (['refunded', 'auto_refunded'].includes(payment.status)) {
    const { error } = await service.rpc('revoke_bachs_payment', { p_payment_id: payment.payment_id, p_environment: config.environment });
    if (error) throw billingError(503, 'We couldn’t update this payment. Please try again shortly.');
    throw billingError(409, 'This payment was refunded. Contact support if you need help.');
  }
  if (session.payment_status === 'failed' || payment.status === 'failed') {
    throw billingError(409, 'Your payment didn’t go through. Try again or choose another payment method.');
  }
  if (payment.status !== 'succeeded') {
    throw billingError(409, 'Your payment is still being confirmed. Check again shortly. Please don’t pay again.');
  }
  if (!matchesBachsPayment(session, payment, checkout)) {
    throw billingError(409, 'We couldn’t match this payment to your monthly pass. Contact support if you were charged.');
  }
  const { data, error } = await service.rpc('fulfill_bachs_checkout', {
    p_reference: checkout.reference, p_checkout_id: session.checkout_id, p_payment_id: payment.payment_id,
    p_paid_at: payment.completed_at, p_environment: config.environment,
  });
  if (error || !data?.[0]) throw billingError(503, 'Payment was received. Your listening access is still being confirmed; check again shortly.');
  return data[0];
}

export async function verifyBachsCheckout(service, userId, reference) {
  if (typeof reference !== 'string' || !referencePattern.test(reference)) throw billingError(400, 'A valid payment reference is required.');
  const { data: checkout, error } = await service.from('bachs_checkouts').select('*')
    .eq(reference.startsWith('chk_') ? 'provider_checkout_id' : 'reference', reference).eq('user_id', userId).maybeSingle();
  if (error) throw billingError(503, 'We couldn’t check your payment. Please try again shortly.');
  if (!checkout) return false;
  await confirmBachsCheckout(service, checkout);
  return true;
}

async function processBachsEvent(service, event, config) {
  if (['checkout.completed', 'collection.succeeded', 'checkout.expired'].includes(event.type)) {
    const checkoutId = event.data.checkout_id;
    if (typeof checkoutId !== 'string') return;
    const { data: checkout, error } = await service.from('bachs_checkouts').select('*')
      .eq('provider_checkout_id', checkoutId).eq('environment', config.environment).maybeSingle();
    if (error) throw billingError(503, 'We couldn’t match this payment.');
    if (!checkout) return;
    try { await confirmBachsCheckout(service, checkout, config); }
    catch (error) {
      if (event.type !== 'checkout.expired' || error.status !== 409) throw error;
    }
  }
  if (event.type === 'refund.paid') {
    const paymentId = event.data.payment_id || event.data.charge_id;
    if (typeof paymentId !== 'string') throw billingError(400, 'Invalid refund event.');
    const payment = await bachsRequest(config, `/payments/${encodeURIComponent(paymentId)}`);
    if (['refunded', 'auto_refunded'].includes(payment.status)) {
      const { error } = await service.rpc('revoke_bachs_payment', { p_payment_id: paymentId, p_environment: config.environment });
      if (error) throw billingError(503, 'We couldn’t update this payment.');
    }
  }
}

export async function receiveBachsWebhook(service, raw, headers) {
  const config = bachsConfig();
  if (raw.length > 32768) throw billingError(413, 'Request body is too large.');
  if (!config.webhookSecret) throw billingError(503, 'Payment notifications are temporarily unavailable.');
  if (!verifyBachsSignature(raw, headers, config.webhookSecret)) throw billingError(401, 'Invalid webhook signature.');
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { throw billingError(400, 'Invalid webhook payload.'); }
  if (!event || typeof event.id !== 'string' || !/^evt_[A-Za-z0-9_-]{1,120}$/.test(event.id) ||
      typeof event.type !== 'string' || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    throw billingError(400, 'Invalid webhook payload.');
  }
  if (!['checkout.completed', 'checkout.expired', 'collection.succeeded', 'refund.paid'].includes(event.type)) return { received: true };
  const paymentId = event.data.payment_id || event.data.charge_id;
  const checkoutId = event.data.checkout_id;
  const match = event.type === 'refund.paid' ? ['payment_id', paymentId] : ['provider_checkout_id', checkoutId];
  if (typeof match[1] !== 'string') return { received: true };
  const { data: ownedCheckout, error: ownershipError } = await service.from('bachs_checkouts').select('reference')
    .eq(match[0], match[1]).eq('environment', config.environment).maybeSingle();
  if (ownershipError) throw billingError(503, 'Payment notification could not be checked.');
  if (!ownedCheckout) return { received: true };
  const eventKey = `${config.environment}:${event.id}`;
  const { error } = await service.from('bachs_webhook_events').upsert({
    event_key: eventKey, environment: config.environment, event_type: event.type, payload: event,
  }, { onConflict: 'event_key', ignoreDuplicates: true });
  if (error) throw billingError(503, 'Payment notification could not be recorded.');
  const { data: recorded, error: readError } = await service.from('bachs_webhook_events').select('status').eq('event_key', eventKey).single();
  if (readError) throw billingError(503, 'Payment notification could not be checked.');
  if (recorded.status === 'processed') return { received: true };
  try {
    await processBachsEvent(service, event, config);
    const { error: saveError } = await service.from('bachs_webhook_events').update({
      status: 'processed', processed_at: new Date().toISOString(), last_error: null,
    }).eq('event_key', eventKey);
    if (saveError) throw saveError;
  } catch {
    await service.from('bachs_webhook_events').update({ status: 'failed', last_error: 'Payment processing will be retried.' }).eq('event_key', eventKey);
    throw billingError(503, 'Payment notification could not be processed. Please retry.');
  }
  return { received: true };
}

export async function reconcileBachsPayments(service) {
  const config = bachsConfig();
  const { data: checkouts, error } = await service.from('bachs_checkouts').select('*')
    .eq('environment', config.environment).in('status', ['initialized', 'expired', 'verified'])
    .not('provider_checkout_id', 'is', null).gt('created_at', new Date(Date.now() - 35 * 86400_000).toISOString())
    .order('created_at').limit(50);
  if (error) throw billingError(503, 'We couldn’t check pending payments.');
  let verifiedCheckouts = 0;
  let pendingCheckouts = 0;
  for (const checkout of checkouts || []) {
    try { await confirmBachsCheckout(service, checkout, config); verifiedCheckouts += 1; }
    catch { pendingCheckouts += 1; }
  }
  const { data: events, error: eventsError } = await service.from('bachs_webhook_events').select('payload')
    .eq('environment', config.environment).in('status', ['received', 'failed']).order('received_at').limit(50);
  if (eventsError) throw billingError(503, 'We couldn’t check pending payment notifications.');
  let retriedEvents = 0;
  for (const { payload: event } of events || []) {
    try {
      await processBachsEvent(service, event, config);
      const { error: updateError } = await service.from('bachs_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), last_error: null })
        .eq('event_key', `${config.environment}:${event.id}`);
      if (!updateError) retriedEvents += 1;
    } catch { pendingCheckouts += 1; }
  }
  return { verifiedCheckouts, pendingCheckouts, retriedEvents };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { bachsConfig, bachsRequest, checkoutUrl, decimalSubunits, matchesBachsPayment, verifyBachsSignature } from './bachs.mjs';
import { checkoutCallbackUrl } from './billing.mjs';
import { hasEntitlement } from './music-api.mjs';

test('Bachs credentials select a fixed environment and cannot mix sandbox and live', () => {
  const sandbox = bachsConfig({ BACHS_ENVIRONMENT: 'sandbox', BACHS_SANDBOX_SECRET_KEY: 'sk_sandbox_example' });
  assert.equal(sandbox.baseUrl, 'https://sandbox-api.bachs.io');
  assert.equal(bachsConfig({ BACHS_SECRETE_KEY: 'sk_live_example' }).baseUrl, 'https://api.bachs.io');
  assert.equal(bachsConfig({ BACHS_LIVE_SECRETE_KEY: 'sk_live_example' }).environment, 'live');
  for (const env of [
    { BACHS_ENVIRONMENT: 'sandbox', BACHS_SECRET_KEY: 'sk_live_example' },
    { BACHS_ENVIRONMENT: 'live', BACHS_SECRET_KEY: 'sk_sandbox_example' },
    { BACHS_ENVIRONMENT: 'invalid', BACHS_SECRET_KEY: 'sk_live_example' },
  ]) assert.throws(() => bachsConfig(env));
  assert.equal(checkoutUrl('https://sandbox-checkout.bachs.io/c/test', sandbox), 'https://sandbox-checkout.bachs.io/c/test');
  for (const url of ['https://checkout.bachs.io/c/test', 'https://sandbox-checkout.bachs.io.evil.test/c/test', 'javascript:alert(1)', 'https://secret@sandbox-checkout.bachs.io/c/test']) {
    assert.throws(() => checkoutUrl(url, sandbox));
  }
  assert.equal(checkoutCallbackUrl('http://127.0.0.1:8080', sandbox.key, 'guru-test', 'http://localhost:8080'), 'http://localhost:8080/subscription?reference=guru-test');
});

test('money parsing rejects precision loss, exponent notation, non-strings, and malformed amounts', () => {
  assert.equal(decimalSubunits('1000.00'), 100000);
  assert.equal(decimalSubunits('1000'), 100000);
  assert.equal(decimalSubunits('1000.5'), 100050);
  for (const value of ['1e3', '-1000', '1000.001', 'NaN', '', 1000, null]) assert.equal(decimalSubunits(value), null);
});

test('only the verified owner, price, purpose, environment and settled payment can unlock a pass', () => {
  const now = new Date().toISOString();
  const checkout = { reference: 'guru-test', provider_checkout_id: 'chk_test', user_id: 'user-test', environment: 'sandbox', customer_email: 'listener@example.test', expected_amount: 100000, currency: 'NGN', created_at: now };
  const session = { checkout_id: 'chk_test', reference: 'guru-test', status: 'completed', payment_status: 'succeeded', amount: '1000.00', currency: 'NGN', customer: { email: 'LISTENER@example.test' }, charge: { payment_id: 'pay_test' }, metadata: { user_id: 'user-test', purpose: 'guruplay-monthly-pass-v1', environment: 'sandbox' } };
  const payment = { payment_id: 'pay_test', checkout_id: 'chk_test', reference: 'guru-test', status: 'succeeded', amount: '1000.00', currency: 'NGN', customer: { email: 'listener@example.test' }, completed_at: now };
  assert.equal(matchesBachsPayment(session, payment, checkout), true);
  for (const change of [
    { status: 'open' }, { payment_status: 'no_payment_required' }, { amount: '10.00' }, { currency: 'USD' },
    { reference: 'another' }, { checkout_id: 'chk_other' }, { customer: { email: 'other@example.test' } },
    { metadata: { ...session.metadata, user_id: 'other' } }, { metadata: { ...session.metadata, environment: 'live' } },
    { recurring: { subscription_id: 'sub_other' } },
  ]) assert.equal(matchesBachsPayment({ ...session, ...change }, payment, checkout), false);
  for (const change of [
    { status: 'failed' }, { status: 'underpaid' }, { status: 'refunded' }, { status: 'accepted' },
    { checkout_id: 'chk_other' }, { reference: 'other' }, { payment_id: 'pay_other' }, { amount: '1.00' },
    { customer: { email: 'other@example.test' } }, { currency: 'USD' }, { completed_at: null },
    { subscription_id: 'sub_other' }, { completed_at: '2000-01-01T00:00:00Z' },
  ]) assert.equal(matchesBachsPayment(session, { ...payment, ...change }, checkout), false);
});

test('Bachs webhook verification checks raw bytes, replay age, and all rotating V2 signatures', () => {
  const now = Date.now(), timestamp = String(Math.floor(now / 1000)), secret = 'whsec_test';
  const raw = Buffer.from(' { "type": "checkout.completed", "data": {} }\n');
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex');
  const headers = { 'x-bachs-signature-v2': `t=${timestamp},v1=${'0'.repeat(64)},v1=${signature}` };
  assert.equal(verifyBachsSignature(raw, headers, secret, now), true);
  assert.equal(verifyBachsSignature(raw, { 'x-bachs-timestamp': timestamp, 'x-bachs-signature': signature }, secret, now), true);
  assert.equal(verifyBachsSignature(Buffer.from(JSON.stringify(JSON.parse(raw))), headers, secret, now), false);
  assert.equal(verifyBachsSignature(raw, headers, secret, now + 301000), false);
  assert.equal(verifyBachsSignature(raw, headers, secret, now - 301000), false);
  assert.equal(verifyBachsSignature(raw, { ...headers, 'x-bachs-signature-v2': `t=${timestamp},t=${timestamp},v1=${signature}` }, secret, now), false);
  assert.equal(verifyBachsSignature(raw, headers, 'wrong', now), false);
});

test('manual passes expire exactly at the paid-through time without extending legacy grace', () => {
  const paidThrough = '2026-12-22T12:00:00Z', expires = Date.parse(paidThrough);
  const pass = { provider: 'bachs', status: 'non_renewing', paid_through: paidThrough };
  assert.equal(hasEntitlement(pass, expires - 1), true);
  assert.equal(hasEntitlement(pass, expires), false);
  assert.equal(hasEntitlement(pass, expires + 1), false);
  assert.equal(hasEntitlement({ ...pass, status: 'cancelled' }, expires - 1), false);
});

test('provider requests preserve the idempotency key and hide HTML errors and credentials', async (t) => {
  const config = bachsConfig({ BACHS_ENVIRONMENT: 'sandbox', BACHS_SANDBOX_SECRET_KEY: 'sk_sandbox_test' });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://sandbox-api.bachs.io/v1/checkout-sessions');
    assert.equal(options.headers['Idempotency-Key'], 'guru-test');
    assert.equal(options.redirect, 'error');
    return new Response('<html>secret exception</html>', { status: 502 });
  });
  await assert.rejects(bachsRequest(config, '/checkout-sessions', { body: { reference: 'guru-test' }, idempotencyKey: 'guru-test' }), {
    message: 'We couldn’t complete the payment request. Please try again shortly.',
  });
});

test('an in-progress provider write retries the exact operation while uncertain failures do not trigger new writes', async (t) => {
  const config = bachsConfig({ BACHS_ENVIRONMENT: 'sandbox', BACHS_SANDBOX_SECRET_KEY: 'sk_sandbox_test' });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, body: options.body, key: options.headers['Idempotency-Key'] });
    return requests.length === 1
      ? Response.json({ error_code: 'IDEMPOTENCY_IN_PROGRESS' }, { status: 409 })
      : Response.json({ checkout_id: 'chk_same' }, { status: 201 });
  });
  const result = await bachsRequest(config, '/checkout-sessions', { body: { reference: 'guru-one' }, idempotencyKey: 'guru-one' });
  assert.equal(result.checkout_id, 'chk_same');
  assert.equal(requests.length, 2); assert.deepEqual(requests[0], requests[1]);
});

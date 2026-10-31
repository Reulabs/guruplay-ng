import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutCallbackUrl, findPaymentSubscription, matchesCheckout } from './billing.mjs';

test('local callbacks require test credentials and live callbacks require HTTPS', () => {
  assert.equal(checkoutCallbackUrl('http://127.0.0.1:8080', 'sk_test_example', 'guru-test'), 'http://127.0.0.1:8080/subscription?reference=guru-test');
  assert.equal(checkoutCallbackUrl('https://music.example/', 'sk_live_example', 'guru-test'), 'https://music.example/subscription?reference=guru-test');
  for (const [url, key] of [
    ['http://127.0.0.1:8080', 'sk_live_example'],
    ['http://music.example', 'sk_test_example'],
    ['https://user:password@music.example', 'sk_test_example'],
    ['invalid', 'sk_test_example'],
  ]) assert.throws(() => checkoutCallbackUrl(url, key, 'guru-test'));
});

test('subscription linking rejects another customer, plan, card, environment, or earlier purchase', () => {
  const transaction = { domain: 'test', paid_at: '2026-10-19T05:23:05Z', customer: { customer_code: 'CUS_test' }, authorization: { authorization_code: 'AUTH_test' } };
  const subscription = { domain: 'test', subscription_code: 'SUB_test', createdAt: '2026-10-19T05:23:06Z', next_payment_date: '2026-11-19T05:23:00Z', customer: { customer_code: 'CUS_test' }, authorization: { authorization_code: 'AUTH_test' }, plan: { plan_code: 'PLN_test' } };
  assert.equal(findPaymentSubscription([subscription], transaction, 'PLN_test'), subscription);
  for (const change of [
    { customer: { customer_code: 'CUS_other' } }, { plan: { plan_code: 'PLN_other' } },
    { authorization: { authorization_code: 'AUTH_other' } }, { domain: 'live' },
    { createdAt: '2026-09-19T05:23:06Z' }, { next_payment_date: 'invalid' },
  ]) assert.equal(findPaymentSubscription([{ ...subscription, ...change }], transaction, 'PLN_test'), undefined);
  assert.equal(findPaymentSubscription([subscription], { ...transaction, authorization: null }, 'PLN_test'), undefined);
});

test('verified payments must match the account, reference, amount, currency and plan', () => {
  const checkout = { reference: 'guru-test', expected_amount: 10000, currency: 'NGN', plan_code: 'PLN_test' };
  const transaction = { status: 'success', reference: 'guru-test', amount: 10000, currency: 'NGN', customer: { email: 'listener@example.com' }, plan_object: { plan_code: 'PLN_test' } };
  assert.equal(matchesCheckout(transaction, checkout, 'LISTENER@example.com'), true);
  assert.equal(matchesCheckout({ ...transaction, plan_object: undefined, plan: 'PLN_test' }, checkout, 'listener@example.com'), true);
  assert.equal(matchesCheckout({ ...transaction, plan_object: undefined, plan: { plan_code: 'PLN_test' } }, checkout, 'listener@example.com'), true);
  for (const change of [
    { status: 'pending' }, { reference: 'another' }, { amount: 1 }, { currency: 'USD' },
    { customer: { email: 'other@example.com' } }, { plan_object: { plan_code: 'PLN_other' } }, { plan_object: {} },
  ]) assert.equal(matchesCheckout({ ...transaction, ...change }, checkout, 'listener@example.com'), false);
  assert.equal(matchesCheckout(transaction, checkout, undefined), false);
});

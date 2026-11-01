export function checkoutCallbackUrl(appUrl, secret, reference, requestOrigin) {
  let url;
  try { url = new URL(appUrl); } catch {
    throw Object.assign(new Error('The public application URL is not configured.'), { status: 503 });
  }
  const localTest = secret?.startsWith('sk_test_') &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.protocol === 'http:';
  if ((url.protocol !== 'https:' && !localTest) || url.username || url.password) {
    throw Object.assign(new Error('Billing requires HTTPS, or a loopback URL with a Paystack test key.'), { status: 503 });
  }
  let returnOrigin = url;
  if (localTest && typeof requestOrigin === 'string') {
    try {
      const requested = new URL(requestOrigin);
      if (requested.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(requested.hostname) &&
          requested.port === url.port && !requested.username && !requested.password && requested.pathname === '/' && !requested.search && !requested.hash) returnOrigin = requested;
    } catch {
      returnOrigin = url;
    }
  }
  const callback = new URL('/subscription', returnOrigin);
  callback.searchParams.set('reference', reference);
  return callback.href;
}

export function matchesCheckout(transaction, checkout, email) {
  const plan = transaction.plan_object?.plan_code || transaction.plan?.plan_code ||
    (typeof transaction.plan === 'string' ? transaction.plan : undefined);
  return transaction.status === 'success' && transaction.reference === checkout.reference &&
    transaction.amount === Number(checkout.expected_amount) && transaction.currency === checkout.currency &&
    typeof email === 'string' && typeof transaction.customer?.email === 'string' &&
    transaction.customer.email.toLowerCase() === email.toLowerCase() && plan === checkout.plan_code;
}

export function findPaymentSubscription(subscriptions, transaction, planCode) {
  const authorizationCode = transaction.authorization?.authorization_code;
  const customerCode = transaction.customer?.customer_code;
  const paidAt = Date.parse(transaction.paid_at);
  if (!authorizationCode || !customerCode || !Number.isFinite(paidAt)) return undefined;
  return subscriptions.find((subscription) =>
    subscription.customer?.customer_code === customerCode &&
    subscription.plan?.plan_code === planCode &&
    subscription.authorization?.authorization_code === authorizationCode &&
    subscription.domain === transaction.domain &&
    typeof subscription.subscription_code === 'string' &&
    Number.isFinite(Date.parse(subscription.next_payment_date)) &&
    Math.abs(Date.parse(subscription.createdAt) - paidAt) < 5 * 60_000
  );
}

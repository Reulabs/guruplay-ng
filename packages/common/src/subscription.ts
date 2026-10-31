export interface SubscriptionStatus {
  entitled: boolean;
  status: string;
  paidThrough: string | null;
  graceEndsAt: string | null;
}

export function checkoutReference(params: URLSearchParams): string | null {
  const references = params.getAll("reference").filter((value) => value.trim());
  const reference = (
    references[references.length - 1] ||
    params.get("trxref") ||
    ""
  ).trim();
  return /^[A-Za-z0-9._=-]{1,100}$/.test(reference) ? reference : null;
}

export async function resolveSubscriptionReturn({
  reference,
  readStatus,
  verify,
}: {
  reference: string | null;
  readStatus: () => Promise<SubscriptionStatus>;
  verify: (reference: string) => Promise<void>;
}): Promise<{ subscription: SubscriptionStatus; message: string | null }> {
  const current = await readStatus();
  if (!reference)
    return {
      subscription: current,
      message:
        "This payment link is incomplete. Check your subscription again or contact support if you were charged.",
    };
  let verificationError: string | null = null;
  try {
    await verify(reference);
  } catch (error) {
    verificationError =
      error instanceof Error
        ? error.message
        : "We couldn’t confirm this payment. Please try again shortly.";
  }
  const subscription = await readStatus();
  return {
    subscription,
    message:
      verificationError ||
      (subscription.entitled
        ? null
        : "Your payment is still being confirmed. Check again shortly. Please don’t pay again."),
  };
}

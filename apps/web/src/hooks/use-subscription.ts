import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { SubscriptionStatus } from "@guruplay/common/subscription";

const subscriptionSchema = z.object({
  entitled: z.boolean(),
  status: z.string(),
  paidThrough: z.string().nullable(),
  graceEndsAt: z.string().nullable(),
});

export const subscriptionKey = (userId?: string) =>
  ["subscription", userId] as const;

export async function billingRequest(
  path: string,
  userId: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<unknown> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId)
    throw new Error("Sign in with the account used at checkout to continue.");
  let response: Response;
  try {
    response = await fetch(`/api/v1/billing/${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      "We couldn’t reach the subscription service. Check your connection and try again.",
    );
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404 && path === "verify")
      throw new Error(
        "We couldn’t match this payment to your account. Sign in with the account used at checkout, or contact support if you were charged.",
      );
    const message = z.object({ error: z.string() }).safeParse(result);
    throw new Error(
      response.status >= 500
        ? "We can’t check your subscription right now. Please try again shortly."
        : message.success
          ? message.data.error
          : "We couldn’t complete this request. Please try again.",
    );
  }
  return result;
}

export async function readSubscription(
  userId: string,
  signal?: AbortSignal,
): Promise<SubscriptionStatus> {
  const result = subscriptionSchema.safeParse(
    await billingRequest("subscription", userId, { signal }),
  );
  if (!result.success)
    throw new Error(
      "We couldn’t read your subscription status. Please try again.",
    );
  return {
    entitled: result.data.entitled,
    status: result.data.status,
    paidThrough: result.data.paidThrough,
    graceEndsAt: result.data.graceEndsAt,
  };
}

export async function verifySubscription(
  reference: string,
  userId: string,
  signal?: AbortSignal,
): Promise<void> {
  const result = z
    .object({ status: z.literal("verified") })
    .safeParse(
      await billingRequest("verify", userId, {
        method: "POST",
        body: { reference },
        signal,
      }),
    );
  if (!result.success)
    throw new Error(
      "Your payment is still being confirmed. Check again shortly.",
    );
}

export function useSubscription() {
  const { user, isAuthLoading } = useAuth();
  return useQuery({
    queryKey: subscriptionKey(user?.id),
    enabled: !!user && !isAuthLoading,
    queryFn: ({ signal }) => {
      if (!user) throw new Error("Sign in to view your subscription.");
      return readSubscription(user.id, signal);
    },
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: "always",
    retry: 1,
  });
}

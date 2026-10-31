import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  checkoutReference,
  resolveSubscriptionReturn,
} from "@guruplay/common/subscription";
import { Button } from "@guruplay/ui/button";
import { useAuth } from "@/context/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import {
  billingRequest,
  readSubscription,
  subscriptionKey,
  verifySubscription,
} from "@/hooks/use-subscription";
import PremiumBadge from "@/components/account/PremiumBadge";

export default function Subscription() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { user, isAuthLoading, openAuthDialog } = useAuth();
  const { startSubscription, checkoutLoading, closeUpgrade } = usePlayer();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reference = checkoutReference(params);
  const hasCallback = params.has("reference") || params.has("trxref");
  const userId = user?.id;
  const result = useQuery({
    queryKey: ["subscription-page", userId, hasCallback, reference],
    enabled: !!userId && !isAuthLoading,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("Sign in to view your subscription.");
      const checked = hasCallback
        ? await resolveSubscriptionReturn({
            reference,
            readStatus: () => readSubscription(userId, signal),
            verify: (paymentReference) =>
              verifySubscription(paymentReference, userId, signal),
          })
        : {
            subscription: await readSubscription(userId, signal),
            message: null,
          };
      signal.throwIfAborted();
      await cache.cancelQueries({
        queryKey: subscriptionKey(userId),
        exact: true,
      });
      signal.throwIfAborted();
      cache.setQueryData(subscriptionKey(userId), checked.subscription);
      return checked;
    },
  });
  const subscription = result.data?.subscription;

  useEffect(() => {
    if (
      !hasCallback ||
      !subscription?.entitled ||
      result.data?.message ||
      result.isFetching
    )
      return;
    closeUpgrade();
    sessionStorage.removeItem("guruplay-return-track");
    navigate("/dashboard", { replace: true });
  }, [
    hasCallback,
    subscription?.entitled,
    result.data?.message,
    result.isFetching,
    closeUpgrade,
    navigate,
  ]);

  const manage = async () => {
    if (!userId) return;
    setBusy(true);
    setActionMessage(null);
    try {
      const response = await billingRequest("manage", userId, {
        method: "POST",
      });
      const parsed = z.object({ message: z.string() }).safeParse(response);
      if (!parsed.success)
        throw new Error(
          "We couldn’t open subscription management. Please try again.",
        );
      setActionMessage(parsed.data.message);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t open subscription management. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const message = isAuthLoading
    ? "Loading your account…"
    : !user
      ? "Sign in with the account used at checkout to check your subscription."
      : result.isPending
        ? hasCallback
          ? "Confirming your subscription…"
          : "Checking your subscription…"
        : result.error?.message ||
          actionMessage ||
          result.data?.message ||
          (subscription?.entitled
            ? hasCallback
              ? "Your subscription is active. Returning to your dashboard…"
              : "Your subscription is active. Full listening is unlocked."
            : "Subscribe monthly to listen to full tracks across the Guruplay catalog.");

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6 pt-16 text-white">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Guruplay subscription</h1>
        {subscription?.entitled && <PremiumBadge />}
      </div>
      <p aria-live="polite" className="leading-7 text-white/70">
        {message}
      </p>
      {!isAuthLoading && !user && (
        <Button variant="outline" onClick={() => openAuthDialog("login")}>
          Sign in
        </Button>
      )}
      {user &&
        (result.error ||
          (hasCallback && !result.isPending && !!result.data?.message)) && (
          <div className="flex flex-wrap items-center gap-4">
            <Button
              disabled={result.isFetching}
              onClick={() => {
                setActionMessage(null);
                void result.refetch();
              }}
            >
              {result.isFetching ? "Checking…" : "Check subscription again"}
            </Button>
            <Link to="/support" className="text-sm underline">
              Get support
            </Link>
          </div>
        )}
      {user && !hasCallback && subscription?.entitled === false && (
        <Button
          onClick={() => {
            setActionMessage(null);
            void startSubscription().catch((error: unknown) =>
              setActionMessage(
                error instanceof Error
                  ? error.message
                  : "We couldn’t open checkout. Please try again.",
              ),
            );
          }}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? "Opening checkout…" : "Subscribe with Paystack"}
        </Button>
      )}
      {user && !hasCallback && subscription?.entitled && (
        <Button onClick={() => void manage()} disabled={busy}>
          {busy ? "Opening…" : "Manage payment method"}
        </Button>
      )}
      <div>
        <Link to="/dashboard" className="text-sm text-white/60 underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

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
import { UserType } from "@/lib/artist";

export default function Subscription() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { user, isAuthLoading, openAuthDialog } = useAuth();
  const { startSubscription, checkoutLoading, closeUpgrade } = usePlayer();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reference = checkoutReference(params);
  const hasCallback = params.has("reference") || params.has("trxref") || params.has("checkout_id");
  const cancelled = params.get("cancelled") === "1";
  const userId = user?.id;
  const returnPath = user?.userType === UserType.Artist || user?.userType === UserType.Admin ? "/dashboard" : "/";
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
    navigate(returnPath, { replace: true });
  }, [
    hasCallback,
    subscription?.entitled,
    result.data?.message,
    result.isFetching,
    closeUpgrade,
    navigate,
    returnPath,
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
              ? "Your monthly pass is active. Taking you back to Guruplay…"
              : "Your listening access is active. Enjoy full tracks across Guruplay."
            : cancelled
              ? "Checkout was cancelled. Your access hasn’t changed. You can try again whenever you’re ready."
              : "Get a month of full-track listening for ₦1,000. Renew when you’re ready; there are no automatic charges.");

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6 pt-16 text-white">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Your Guruplay membership</h1>
        {subscription?.entitled && <PremiumBadge />}
      </div>
      <p aria-live="polite" className="leading-7 text-white/70">
        {message}
      </p>
      {subscription?.paidThrough && subscription.entitled && (
        <p className="text-sm leading-6 text-white/70">
          Access until {new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short" }).format(new Date(subscription.paidThrough))}.
          {subscription.renewalMode === "manual" && " Your pass does not renew automatically."}
        </p>
      )}
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
          {checkoutLoading ? "Opening checkout…" : "Get a monthly pass · ₦1,000"}
        </Button>
      )}
      {user && !hasCallback && subscription?.entitled && subscription.renewalMode !== "manual" && (
        <Button onClick={() => void manage()} disabled={busy}>
          {busy ? "Opening…" : "Manage payment method"}
        </Button>
      )}
      <div>
        <Link to={returnPath} className="text-sm text-white/60 underline">
          Back to Guruplay
        </Link>
      </div>
    </main>
  );
}

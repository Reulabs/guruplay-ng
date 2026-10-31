import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@guruplay/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCatalog } from "@/hooks/use-catalog";
import { usePlayer } from "@/context/PlayerContext";

const Subscription = () => {
  const [params] = useSearchParams();
  const { user, isAuthLoading, openAuthDialog } = useAuth();
  const { data } = useCatalog();
  const { play, startSubscription, checkoutLoading } = usePlayer();
  const [message, setMessage] = useState("Checking your subscription…");
  const [busy, setBusy] = useState(false);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const reference = params.get("reference");
  const userId = user?.id;

  useEffect(() => {
    if (isAuthLoading) return;
    setEntitled(null);
    if (!userId) {
      setMessage(reference ? "Sign in to confirm this payment." : "Sign in to subscribe or view your subscription.");
      return;
    }
    const controller = new AbortController();
    setMessage(reference ? "Confirming your payment…" : "Checking your subscription…");
    void (async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error("Sign in to view your subscription.");
      }
      if (reference) {
        const response = await fetch("/api/v1/billing/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.session.access_token}` },
          body: JSON.stringify({ reference }),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.status !== "verified") {
          throw new Error(result?.error || "We could not confirm the payment yet. Check again in a moment.");
        }
      }
      const response = await fetch("/api/v1/billing/subscription", {
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
        signal: controller.signal,
      });
      const subscription = await response.json().catch(() => null);
      if (!response.ok || typeof subscription?.entitled !== "boolean") {
        throw new Error(subscription?.error || "We could not check your subscription. Please try again.");
      }
      if (controller.signal.aborted) return;
      setEntitled(subscription.entitled);
      setMessage(subscription.entitled
        ? "Your subscription is active. Full listening is unlocked."
        : "Subscribe monthly to listen to full tracks across the Guruplay catalog.");
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "We could not check your subscription.");
    });
    return () => controller.abort();
  }, [isAuthLoading, userId, reference]);

  useEffect(() => {
    if (!reference || !entitled || !data?.tracks) return;
    const resumeId = sessionStorage.getItem("guruplay-return-track");
    const track = data.tracks.find((item) => item.id === resumeId);
    if (track) {
      sessionStorage.removeItem("guruplay-return-track");
      play(track);
    }
  }, [data?.tracks, entitled, play, reference]);

  const manage = async () => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      openAuthDialog("login");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/v1/billing/manage", {
        method: "POST", headers: { Authorization: `Bearer ${authData.session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open subscription management.");
      setMessage(result.message || "Paystack sent your management link by email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6 pt-16 text-white">
      <h1 className="text-3xl font-bold">Guruplay subscription</h1>
      <p aria-live="polite" className="text-white/70">{message}</p>
      {!isAuthLoading && !user && <Button variant="outline" onClick={() => openAuthDialog("login")}>Sign in</Button>}
      {user && entitled === false && <Button onClick={() => void startSubscription().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to start checkout."))} disabled={checkoutLoading}>{checkoutLoading ? "Opening checkout…" : "Subscribe with Paystack"}</Button>}
      {user && entitled === true && <Button onClick={() => void manage().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to manage your subscription."))} disabled={busy}>{busy ? "Opening…" : "Manage payment method"}</Button>}
      <div><Link to="/" className="text-sm underline text-white/60">Back to Guruplay</Link></div>
    </main>
  );
};

export default Subscription;

import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@guruplay/ui/button";
import { Input } from "@guruplay/ui/input";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import PersonalGate from "@/components/PersonalGate";
import {
  useSettings,
  usePersonalMutation,
  Preferences,
} from "@/hooks/use-personal";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import PremiumBadge from "@/components/account/PremiumBadge";
function Contents() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const settings = useSettings();
  const mutation = usePersonalMutation();
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settings.data) {
      setName(settings.data.display_name);
      setPrefs(settings.data.preferences);
    }
  }, [settings.data]);
  if (settings.isLoading) return <LoadingState />;
  if (settings.error)
    return (
      <ErrorState
        title="We couldn’t load your settings"
        description={settings.error.message}
        onRetry={() => void settings.refetch()}
      />
    );
  if (!prefs) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    try {
      await mutation.mutateAsync({
        path: "me/settings",
        method: "PATCH",
        body: { display_name: name, ...prefs },
      });
      setSaved(true);
    } catch {
      /* Mutation exposes its error below. */
    }
  };
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Make Guruplay feel like yours.
      </p>
      <form
        onSubmit={submit}
        onChange={() => setSaved(false)}
        className="space-y-7"
      >
        <section className="rounded-2xl border border-white/10 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Your account</h2>
            {subscription.data?.entitled && <PremiumBadge />}
          </div>
          <label className="block">
            Display name
            <Input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="break-all">{user?.email}</p>
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 p-5 space-y-6">
          <h2 className="text-lg font-bold">Playback & privacy</h2>
          <label className="block" htmlFor="default-volume">
            Default volume · {Math.round(prefs.volume * 100)}%
            <input
              id="default-volume"
              className="block w-full mt-3 accent-primary"
              type="range"
              min="0"
              max="100"
              value={Math.round(prefs.volume * 100)}
              onChange={(e) =>
                setPrefs({ ...prefs, volume: Number(e.target.value) / 100 })
              }
            />
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-primary"
              checked={prefs.autoplay}
              onChange={(e) =>
                setPrefs({ ...prefs, autoplay: e.target.checked })
              }
            />
            <span>
              Continue playing your queue
              <span className="block text-sm text-muted-foreground mt-1">
                Automatically play the next song when a full track ends.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-primary"
              checked={prefs.private_session}
              onChange={(e) =>
                setPrefs({ ...prefs, private_session: e.target.checked })
              }
            />
            <span>
              Private session
              <span className="block text-sm text-muted-foreground mt-1">
                Keep new listening out of your history and use non-personalized
                recommendations. Saved songs and playlists still work.
              </span>
            </span>
          </label>
        </section>
        {mutation.error && (
          <p role="alert" className="text-red-300">
            {mutation.error.message}
          </p>
        )}
        {saved && (
          <p role="status" className="text-green-300">
            Settings saved.
          </p>
        )}
        <Button disabled={mutation.isPending || !name.trim()} type="submit">
          {mutation.isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>
      <div className="mt-8 flex flex-wrap gap-4 text-primary">
        <Link to="/subscription" className="underline">
          Manage subscription
        </Link>
        <Link to="/support" className="underline">
          Get support
        </Link>
        <Link to="/library?view=history" className="underline">
          Manage listening history
        </Link>
      </div>
    </div>
  );
}
export default function Settings() {
  return (
    <div className="p-5 md:p-8 pb-56">
      <PersonalGate>
        <Contents />
      </PersonalGate>
    </div>
  );
}

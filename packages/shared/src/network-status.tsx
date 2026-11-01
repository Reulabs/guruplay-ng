import { useEffect, useRef, useState } from "react";
import { CheckCircle2, WifiOff, X } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [recovered, setRecovered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const previouslyOffline = useRef(!online);

  useEffect(() => {
    const offline = () => {
      previouslyOffline.current = true;
      setOnline(false);
      setRecovered(false);
      setDismissed(false);
    };
    const connected = () => {
      setOnline(true);
      setDismissed(false);
      if (previouslyOffline.current) {
        setRecovered(true);
        previouslyOffline.current = false;
      }
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", connected);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", connected);
    };
  }, []);

  useEffect(() => {
    if (!recovered) return;
    const timer = window.setTimeout(() => setRecovered(false), 3500);
    return () => window.clearTimeout(timer);
  }, [recovered]);

  if (dismissed || (online && !recovered)) return null;
  const Icon = online ? CheckCircle2 : WifiOff;
  return (
    <aside
      aria-label="Connection status"
      className="fixed bottom-[190px] right-3 z-[80] flex max-w-[min(340px,calc(100vw-24px))] items-start gap-3 rounded-xl border border-white/15 bg-[#202020] p-4 text-white shadow-xl md:bottom-[116px] md:right-5"
    >
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-white/70"
        aria-hidden="true"
      />
      <div role="status" aria-live="polite" className="min-w-0">
        <p className="text-sm font-semibold">
          {online ? "You’re back online" : "You’re offline"}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/55">
          {online
            ? "Your connection has been restored."
            : "Reconnect to load music or upload a track."}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss connection notice"
        onClick={() => setDismissed(true)}
        className="-m-1 rounded p-1 text-white/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}

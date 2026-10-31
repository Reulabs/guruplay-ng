import { Crown } from "lucide-react";

export default function PremiumBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold tracking-wide text-primary">
      <Crown className="h-3 w-3" aria-hidden="true" />
      Premium
    </span>
  );
}

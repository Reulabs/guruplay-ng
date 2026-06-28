import { Inbox, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) => (
  <div
    className={`flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-12 text-center ${className}`}
  >
    <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-white/45">
      <Icon className="h-6 w-6" />
    </div>
    <Typography as="h2" variant="h3" weight="bold">
      {title}
    </Typography>
    <Typography variant="body" tone="muted" className="mt-2 max-w-md">
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button onClick={onAction} className="mt-6 rounded-full px-6 font-bold">
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;

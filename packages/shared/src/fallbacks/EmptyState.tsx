import { Inbox, LucideIcon } from "lucide-react";
import { Button } from "@guruplay/ui/button";
import Typography from "@guruplay/ui/typography";
import FeedbackIllustration from "./FeedbackIllustration";

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
    <FeedbackIllustration icon={Icon} />
    <Typography as="h2" variant="h3" weight="bold" align="center">
      {title}
    </Typography>
    <Typography
      variant="body"
      tone="muted"
      align="center"
      className="mt-2 max-w-md"
    >
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

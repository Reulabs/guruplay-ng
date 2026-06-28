import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

const ErrorState = ({
  title = "Unable to load this content",
  description,
  onRetry,
}: ErrorStateProps) => (
  <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-red-400/15 bg-red-400/[0.04] px-6 py-12 text-center">
    <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-red-400/10 text-red-200">
      <CircleAlert className="h-6 w-6" />
    </div>
    <Typography as="h2" variant="h3" weight="bold">
      {title}
    </Typography>
    <Typography variant="body" tone="muted" className="mt-2 max-w-md">
      {description}
    </Typography>
    {onRetry && (
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-6 rounded-full border-white/10 px-6"
      >
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;

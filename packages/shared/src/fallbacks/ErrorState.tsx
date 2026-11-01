import { RefreshCw } from "lucide-react";
import { Button } from "@guruplay/ui/button";
import Typography from "@guruplay/ui/typography";
import { feedbackMessage } from "@guruplay/common/http";
import FeedbackIllustration from "./FeedbackIllustration";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

const ErrorState = ({
  title = "A little interruption",
  description,
  onRetry,
}: ErrorStateProps) => (
  <div
    role="status"
    className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.015] px-6 py-10 text-center sm:py-12"
  >
    <FeedbackIllustration />
    <Typography as="h2" variant="h3" weight="semibold" align="center">
      {title}
    </Typography>
    <Typography
      variant="body"
      tone="muted"
      align="center"
      className="mt-2 max-w-sm text-pretty"
    >
      {feedbackMessage(description)}
    </Typography>
    {onRetry && (
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-6 rounded-full border-white/10 px-6"
      >
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;

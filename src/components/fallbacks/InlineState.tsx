import { CircleAlert, Inbox } from "lucide-react";
import Typography from "@/components/ui/typography";

interface InlineStateProps {
  title: string;
  description?: string;
  tone?: "empty" | "error";
}

const InlineState = ({
  title,
  description,
  tone = "empty",
}: InlineStateProps) => {
  const Icon = tone === "error" ? CircleAlert : Inbox;

  return (
    <div className="flex items-start gap-3 rounded-xl p-4 text-white/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <Typography variant="body-sm" weight="bold">
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" className="mt-1 text-white/45">
            {description}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default InlineState;

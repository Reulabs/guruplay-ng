import { Music2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@guruplay/ui/button";
import MusicSkeleton from "./MusicSkeleton";

interface CatalogFallbackProps {
  error?: string;
  title?: string;
  description?: string;
  onRetry: () => void;
  onUpload?: () => void;
}

export default function CatalogFallback({
  error,
  title = "The next release starts here",
  description = "There’s no music here yet. New releases will appear as artists share their work.",
  onRetry,
  onUpload,
}: CatalogFallbackProps) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-xl border border-white/[0.06] bg-[#101010] px-5 py-8 sm:px-8 sm:py-10"
      aria-label={error ? "Music unavailable" : "Empty music catalog"}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-6 -z-10 opacity-40 sm:inset-x-8"
        aria-hidden="true"
      >
        <MusicSkeleton animated={false} />
      </div>
      <div className="mx-auto flex max-w-md flex-col items-center bg-[#101010]/95 px-3 py-5 text-center">
        <Music2 className="mb-5 h-8 w-8 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight">
          {error ? "We couldn’t load the music" : title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {error
            ? "Check your connection and try again. Your library and uploads are safe."
            : description}
        </p>
        {error && (
          <details className="mt-3 max-w-full text-xs text-muted-foreground">
            <summary className="cursor-pointer">Connection details</summary>
            <p className="mt-2 break-words">{error}</p>
          </details>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onUpload && !error && (
            <Button onClick={onUpload} className="rounded-full px-5">
              <Upload className="mr-1 h-4 w-4" />
              Upload music
            </Button>
          )}
          <Button
            onClick={onRetry}
            variant="outline"
            className="rounded-full border-white/15 bg-transparent px-5"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {error ? "Try again" : "Refresh music"}
          </Button>
        </div>
      </div>
    </section>
  );
}

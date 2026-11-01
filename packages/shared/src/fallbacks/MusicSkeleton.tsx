import { cn } from "@guruplay/ui/utils";

interface MusicSkeletonProps {
  count?: number;
  animated?: boolean;
  rows?: boolean;
}

export default function MusicSkeleton({
  count = 5,
  animated = true,
  rows = false,
}: MusicSkeletonProps) {
  return (
    <div
      role={animated ? "status" : undefined}
      aria-label={animated ? "Loading music" : undefined}
      aria-busy={animated || undefined}
    >
      <div
        aria-hidden="true"
        className={cn(
          rows
            ? "space-y-4"
            : "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-5",
          animated && "motion-safe:animate-pulse",
        )}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className={rows ? "flex items-center gap-4" : "min-w-0"}
          >
            <div
              className={cn(
                "bg-white/[0.055]",
                rows
                  ? "h-12 w-12 shrink-0 rounded-md"
                  : "aspect-square rounded-lg",
              )}
            />
            <div className={rows ? "flex-1 space-y-2.5" : "mt-4 space-y-2.5"}>
              <div className="h-3 w-3/4 rounded bg-white/[0.07]" />
              <div className="h-2.5 w-1/2 rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

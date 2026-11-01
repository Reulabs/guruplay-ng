import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Heart,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@guruplay/ui/utils";
import { Slider } from "@guruplay/ui/slider";
import { useEffect, useState } from "react";
import { Button } from "@guruplay/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@guruplay/ui/dialog";

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const PlayerBar = () => {
  const { isAuthDialogOpen } = useAuth();
  const {
    queue,
    removeFromQueue,
    clearQueue,
    play,
    currentTrack,
    isPlaying,
    isPreview,
    showUpgrade,
    checkoutLoading,
    closeUpgrade,
    startSubscription,
    state,
    likedTrackIds,
    isSavingSong,
    toggleLike,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const liked = likedTrackIds.has(currentTrack?.id || "");
  useEffect(() => {
    if (isAuthDialogOpen || showUpgrade) setShowQueue(false);
  }, [isAuthDialogOpen, showUpgrade]);

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      {!isAuthDialogOpen && !showUpgrade && (
        <Dialog open={showQueue} onOpenChange={setShowQueue}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Play queue</DialogTitle>
              <DialogDescription>
                {queue.length
                  ? "Up next, in order."
                  : "Add songs using a song menu."}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {queue.map((track) => (
                <div className="flex gap-2 items-center" key={track.id}>
                  <button
                    className="min-w-0 flex-1 truncate text-left p-2 hover:underline"
                    onClick={() => {
                      setShowQueue(false);
                      removeFromQueue(track.id);
                      play(track);
                    }}
                  >
                    {track.title} · {track.artist}
                  </button>
                  <Button
                    variant="ghost"
                    aria-label={`Remove ${track.title} from queue`}
                    onClick={() => removeFromQueue(track.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            {queue.length > 0 && (
              <Button variant="outline" onClick={clearQueue}>
                Clear queue
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
      {!isAuthDialogOpen && (
        <Dialog
          open={showUpgrade}
          onOpenChange={(open) => {
            if (!open) closeUpgrade();
          }}
        >
          <DialogContent className="z-[70] border-white/10 bg-[#151515] text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enjoy the full track</DialogTitle>
              <DialogDescription className="text-white/60">
                Your free preview has ended. Subscribe to Guruplay for full
                catalog access.
              </DialogDescription>
            </DialogHeader>
            {checkoutError && (
              <p role="alert" className="text-sm text-red-300">
                {checkoutError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeUpgrade}>
                Later
              </Button>
              <Button
                onClick={() => {
                  setCheckoutError(null);
                  void startSubscription().catch((error: unknown) =>
                    setCheckoutError(
                      error instanceof Error
                        ? error.message
                        : "Unable to start checkout.",
                    ),
                  );
                }}
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? "Opening checkout…"
                  : "Subscribe with Paystack"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="fixed bottom-[84px] md:bottom-3 left-3 right-3 z-50 h-[92px] rounded-2xl border border-white/10 bg-[#101010]/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl md:left-[272px]">
        <div className="h-full px-3 md:px-4 flex items-center justify-between gap-2 md:gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none md:w-[30%]">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="hidden sm:block shrink-0 h-14 w-14 rounded-lg object-cover shadow-lg"
              />
            ) : (
              <div
                className="hidden sm:block shrink-0 h-14 w-14 rounded-lg bg-white/[0.06]"
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentTrack.artist}
              </p>
              <span className="text-[10px] text-primary">
                {state === "error"
                  ? "Playback unavailable"
                  : isPreview
                    ? "Preview"
                    : "Full track"}
              </span>
            </div>
            <button
              aria-label={
                liked ? "Remove from saved songs" : "Save current song"
              }
              aria-pressed={liked}
              disabled={isSavingSong}
              onClick={() => toggleLike(currentTrack.id)}
              className={cn(
                "hidden sm:flex p-2 transition-colors",
                liked
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1 shrink-0 md:w-[40%] max-w-[720px]">
            <div className="flex items-center gap-2">
              <button
                aria-label="Shuffle"
                onClick={toggleShuffle}
                className={cn(
                  "hidden sm:flex p-2 transition-colors",
                  shuffle
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                aria-label="Previous track"
                onClick={previous}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              <button
                aria-label={isPlaying ? "Pause playback" : "Resume playback"}
                onClick={toggle}
                className="p-2.5 rounded-full bg-white text-black shadow-lg hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>
              <button
                aria-label="Next track"
                onClick={next}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
              <button
                aria-label="Repeat"
                onClick={toggleRepeat}
                className={cn(
                  "hidden sm:flex p-2 transition-colors",
                  repeat !== "off"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {repeat === "one" ? (
                  <Repeat1 className="h-4 w-4" />
                ) : (
                  <Repeat className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="hidden sm:flex items-center gap-2 w-full">
              <span className="text-[11px] text-muted-foreground w-10 text-right tabular-nums">
                {formatTime(progress)}
              </span>
              <Slider
                aria-label="Playback position"
                value={[progress]}
                max={duration || 100}
                step={1}
                onValueChange={([value]) => seek(value)}
                className="flex-1"
              />
              <span className="text-[11px] text-muted-foreground w-10 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume & Queue */}
          <div className="flex items-center gap-1 justify-end md:w-[30%]">
            <button
              aria-label="Open play queue"
              onClick={() => setShowQueue(!showQueue)}
              className={cn(
                "p-2 transition-colors",
                showQueue
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListMusic className="h-4 w-4" />
            </button>
            <button
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="hidden md:block p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <Slider
              aria-label="Volume"
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={([value]) => setVolume(value / 100)}
              className="hidden md:block w-24"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerBar;

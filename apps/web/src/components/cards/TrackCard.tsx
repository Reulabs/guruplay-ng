import { useState } from "react";
import { Play, Pause, MoreHorizontal, Music2, Heart } from "lucide-react";
import { Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { usePlaylists, usePersonalMutation } from "@/hooks/use-personal";
import { cn } from "@guruplay/ui/utils";
import { Button } from "@guruplay/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@guruplay/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@guruplay/ui/dialog";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import PlaylistForm from "@/components/PlaylistForm";
import { useToast } from "@/hooks/use-toast";
interface TrackCardProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
  variant?: "row" | "tile";
}
const TrackCard = ({
  track,
  index,
  showIndex = false,
  variant = "row",
}: TrackCardProps) => {
  const {
    currentTrack,
    isPlaying,
    play,
    pause,
    likedTrackIds,
    isSavingSong,
    toggleLike,
    addToQueue,
  } = usePlayer();
  const { user, openAuthDialog } = useAuth();
  const playlists = usePlaylists();
  const mutation = usePersonalMutation();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const active = currentTrack?.id === track.id;
  const playing = active && isPlaying;
  const add = async (id: string) => {
    try {
      await mutation.mutateAsync({
        path: `playlists/${id}/songs/${track.id}`,
        method: "PUT",
      });
      setAdding(false);
      toast({ title: "Added to playlist", description: track.title });
    } catch {
      setAdding(true);
    }
  };
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Song menu for ${track.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={isSavingSong}
          onSelect={() => toggleLike(track.id)}
        >
          {likedTrackIds.has(track.id)
            ? "Remove from saved songs"
            : "Save song"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (!user) openAuthDialog("login");
            else setAdding(true);
          }}
        >
          Add to playlist
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            addToQueue(track);
            toast({ title: "Added to queue", description: track.title });
          }}
        >
          Add to queue
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <>
      {variant === "tile" ? (
        <article className="group min-w-0">
          <button
            type="button"
            aria-label={`${playing ? "Pause" : "Play"} ${track.title}`}
            onClick={() => (playing ? pause() : play(track))}
            className="relative block aspect-square w-full overflow-hidden rounded-lg bg-white/[0.045] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d0d0d]"
          >
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={`${track.title} cover`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none"
              />
            ) : (
              <div className="grid h-full w-full place-items-center border border-white/[0.04]">
                <Music2
                  className="h-12 w-12 text-white/15"
                  aria-hidden="true"
                />
              </div>
            )}
            <span
              className={cn(
                "absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100",
                active && "sm:translate-y-0 sm:opacity-100",
              )}
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </span>
          </button>
          <div className="mt-3 flex min-w-0 items-start gap-1">
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "truncate text-sm font-bold leading-6",
                  active && "text-primary",
                )}
              >
                {track.title}
              </h3>
              <p className="truncate text-xs leading-5 text-white/45">
                {track.artist}
              </p>
            </div>
            {menu}
          </div>
        </article>
      ) : (
        <div
          className={cn(
            "group grid grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[28px_minmax(0,4fr)_minmax(0,2fr)_auto] gap-3 items-center px-2 md:px-4 py-3 rounded-xl hover:bg-secondary/60",
            active && "bg-secondary/60",
          )}
        >
          <button
            className="grid place-items-center h-8 w-8"
            aria-label={`${playing ? "Pause" : "Play"} ${track.title}`}
            onClick={() => (playing ? pause() : play(track))}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : showIndex ? (
              <>
                <span className="group-hover:hidden group-focus-within:hidden text-sm text-muted-foreground">
                  {index}
                </span>
                <Play className="hidden group-hover:block group-focus-within:block h-4 w-4" />
              </>
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            className="flex gap-3 min-w-0 text-left items-center"
            onClick={() => (playing ? pause() : play(track))}
            aria-label={`${playing ? "Pause" : "Play"} ${track.title} by ${track.artist}`}
          >
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt=""
                className="h-10 w-10 rounded object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-white/5 shrink-0" />
            )}
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-medium truncate",
                  active && "text-primary",
                )}
              >
                {track.title}
              </span>
              <span className="block text-xs text-muted-foreground truncate">
                {track.artist}
              </span>
            </span>
          </button>
          <p className="hidden md:block text-sm text-muted-foreground truncate">
            {track.genre || "Uncategorized"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              disabled={isSavingSong}
              aria-label={
                likedTrackIds.has(track.id)
                  ? `Remove ${track.title} from favourites`
                  : `Add ${track.title} to favourites`
              }
              aria-pressed={likedTrackIds.has(track.id)}
              onClick={() => toggleLike(track.id)}
              className={
                likedTrackIds.has(track.id)
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  likedTrackIds.has(track.id) && "fill-current",
                )}
              />
            </Button>
            <span className="hidden sm:block text-xs tabular-nums text-muted-foreground">
              {Math.floor(track.duration / 60)}:
              {Math.floor(track.duration % 60)
                .toString()
                .padStart(2, "0")}
            </span>
            {menu}
          </div>
        </div>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription>
              {track.title} · Choose a private playlist.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && (
            <p role="alert" className="text-red-300">
              {mutation.error.message}
            </p>
          )}
          {playlists.isLoading ? (
            <LoadingState />
          ) : playlists.error ? (
            <ErrorState
              description={playlists.error.message}
              onRetry={() => void playlists.refetch()}
            />
          ) : playlists.data?.items.length ? (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {playlists.data.items.map((item) => (
                <Button
                  className="w-full justify-start truncate"
                  variant="outline"
                  key={item.id}
                  disabled={mutation.isPending}
                  onClick={() => void add(item.id)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Create your first playlist"
              description="Group the songs you want to hear together."
            />
          )}
          <Button onClick={() => setCreating(true)}>Create playlist</Button>
        </DialogContent>
      </Dialog>
      {creating && (
        <PlaylistForm
          open
          onClose={() => setCreating(false)}
          onCreated={(id) => void add(id)}
        />
      )}
    </>
  );
};
export default TrackCard;

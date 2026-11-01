import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Trash2, ListMusic } from "lucide-react";
import { Button } from "@guruplay/ui/button";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@guruplay/ui/alert-dialog";
import PersonalGate from "@/components/PersonalGate";
import PlaylistForm from "@/components/PlaylistForm";
import TrackCard from "@/components/cards/TrackCard";
import { usePlaylist, usePersonalMutation } from "@/hooks/use-personal";
import { usePlayer } from "@/context/PlayerContext";
function Contents() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = usePlaylist(id);
  const mutation = usePersonalMutation();
  const { playPlaylist, addToQueue } = usePlayer();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (query.isLoading) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return null;
  const { item, tracks, songIds } = query.data;
  const move = async (trackId: string, direction: number) => {
    const ordered = [...songIds];
    const at = ordered.indexOf(trackId);
    const neighbor = tracks[tracks.findIndex((track) => track.id === trackId) + direction];
    if (!neighbor) return;
    const target = ordered.indexOf(neighbor.id);
    [ordered[at], ordered[target]] = [ordered[target], ordered[at]];
    try {
      await mutation.mutateAsync({
        path: `playlists/${id}/order`,
        method: "PUT",
        body: { song_ids: ordered, revision: item.revision },
      });
    } catch {
      await query.refetch();
    }
  };
  return (
    <>
      <Link
        to="/library?view=playlists"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Your playlists
      </Link>
      <div className="mt-6 mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 to-transparent p-6 md:p-10">
        <p className="text-sm text-muted-foreground mb-4">
          PRIVATE PLAYLIST · {tracks.length}{" "}
          {tracks.length === 1 ? "song" : "songs"}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold break-words">
          {item.name}
        </h1>
        {item.description && (
          <p className="mt-4 text-muted-foreground whitespace-pre-wrap break-words">
            {item.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            disabled={!tracks.length}
            onClick={() => playPlaylist(tracks)}
          >
            Play all
          </Button>
          <Button
            disabled={!tracks.length}
            variant="outline"
            onClick={() => tracks.forEach(addToQueue)}
          >
            Add to queue
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit playlist
          </Button>
          <Button variant="outline" onClick={() => setDeleting(true)}>
            Delete playlist
          </Button>
        </div>
      </div>
      {mutation.error && (
        <p role="alert" className="mb-4 text-red-300">
          {mutation.error.message}
        </p>
      )}
      {songIds.length > tracks.length && (
        <p className="mb-4 text-muted-foreground">
          Some tracks are currently unavailable and cannot be played.
        </p>
      )}
      {tracks.length ? (
        tracks.map((track, index) => (
          <div
            key={track.id}
            className="rounded-xl border-b border-white/5 py-2"
          >
            <TrackCard track={track} index={index + 1} showIndex />
            <div className="flex justify-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Move ${track.title} up`}
                disabled={mutation.isPending || index === 0}
                onClick={() => void move(track.id, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Move ${track.title} down`}
                disabled={
                  mutation.isPending ||
                  index === tracks.length - 1
                }
                onClick={() => void move(track.id, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Remove ${track.title} from playlist`}
                disabled={mutation.isPending}
                onClick={() => {
                  void mutation
                    .mutateAsync({
                      path: `playlists/${id}/songs/${track.id}`,
                      method: "DELETE",
                    })
                    .catch(() => undefined);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          icon={ListMusic}
          title="Choose your first track"
          description="Find music and use its song menu to add it to this playlist."
          actionLabel="Find music"
          onAction={() => navigate("/search")}
        />
      )}
      {editing && (
        <PlaylistForm open playlist={item} onClose={() => setEditing(false)} />
      )}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              “{item.name}” and its track list will be removed. Your saved songs
              will stay in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void mutation
                  .mutateAsync({ path: `playlists/${id}`, method: "DELETE" })
                  .then(() => navigate("/library?view=playlists"))
                  .catch(() => undefined);
              }}
            >
              Delete playlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export default function PlaylistDetail() {
  return (
    <div className="p-5 md:p-8 pb-56">
      <PersonalGate>
        <Contents />
      </PersonalGate>
    </div>
  );
}

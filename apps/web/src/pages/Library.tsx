import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, ListMusic, Plus, Clock3 } from "lucide-react";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import { Button } from "@guruplay/ui/button";
import {
  useLibrary,
  usePlaylists,
  useSettings,
  usePersonalMutation,
} from "@/hooks/use-personal";
import { usePlayer } from "@/context/PlayerContext";
import PersonalGate from "@/components/PersonalGate";
import PlaylistForm from "@/components/PlaylistForm";
import TrackCard from "@/components/cards/TrackCard";
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
function Contents() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const view =
    requested === "history" || requested === "playlists"
      ? requested
      : "favourites";
  const library = useLibrary();
  const playlists = usePlaylists();
  const settings = useSettings();
  const mutation = usePersonalMutation();
  const { playPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();
  const error = view === "playlists" ? playlists.error : library.error;
  const loading =
    view === "playlists" ? playlists.isLoading : library.isLoading;
  const tracks =
    view === "history"
      ? library.data?.history || []
      : library.data?.saved || [];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl font-bold">Your library</h1>
          <p className="mt-2 text-muted-foreground">
            Your music, saved for another listen.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create playlist
        </Button>
      </div>
      <nav aria-label="Library views" className="flex flex-wrap gap-2 mb-6">
        {[
          ["favourites", "Saved songs"],
          ["playlists", "Playlists"],
          ["history", "Recently played"],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={view === key ? "default" : "outline"}
            onClick={() => setParams({ view: key })}
          >
            {label}
          </Button>
        ))}
      </nav>
      {mutation.error && (
        <p role="alert" className="mb-4 text-red-300">
          {mutation.error.message}
        </p>
      )}
      {settings.data?.preferences.private_session && view === "history" && (
        <p className="mb-4 text-muted-foreground">
          Private session is on. New listening activity stays out of your
          history.
        </p>
      )}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          description={error.message}
          onRetry={() => {
            void library.refetch();
            void playlists.refetch();
          }}
        />
      ) : view === "playlists" ? (
        playlists.data?.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {playlists.data.items.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/playlist/${playlist.id}`}
                className="rounded-2xl border border-white/10 p-6 hover:bg-white/5"
              >
                <ListMusic className="h-9 w-9 mb-4 text-primary" />
                <h2 className="text-lg font-bold break-words">
                  {playlist.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {playlist.description || "Private playlist"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListMusic}
            title="Room for your next collection"
            description="Create a private playlist, then add songs from the music menu."
            actionLabel="Create playlist"
            onAction={() => setCreating(true)}
          />
        )
      ) : tracks.length ? (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button onClick={() => playPlaylist(tracks)}>Play all</Button>
            {view === "history" && (
              <Button variant="outline" onClick={() => setClearing(true)}>
                Clear history
              </Button>
            )}
          </div>
          {tracks.map((track, index) => (
            <div key={track.id}>
              <TrackCard track={track} index={index + 1} showIndex />
              {"playedAt" in track && (
                <p className="ml-14 mb-3 text-xs text-muted-foreground">
                  {new Date(String(track.playedAt)).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </>
      ) : (
        <EmptyState
          icon={view === "history" ? Clock3 : Heart}
          title={
            view === "history"
              ? "Your next listen starts here"
              : "Keep the songs you love"
          }
          description={
            view === "history"
              ? "Tracks you play appear here unless private session is on."
              : "Use the heart or song menu to save music to your library."
          }
          actionLabel="Find music"
          onAction={() => navigate("/search")}
        />
      )}
      {creating && (
        <PlaylistForm
          open
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/playlist/${id}`)}
        />
      )}
      <AlertDialog open={clearing} onOpenChange={setClearing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your listening history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your personal listening history and refreshes
              recommendations. Saved songs and playlists stay in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                void mutation
                  .mutateAsync({ path: "library/history", method: "DELETE" })
                  .then(() => setClearing(false))
                  .catch(() => undefined);
              }}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export default function Library() {
  return (
    <div className="p-5 md:p-8 pb-56">
      <PersonalGate>
        <Contents />
      </PersonalGate>
    </div>
  );
}

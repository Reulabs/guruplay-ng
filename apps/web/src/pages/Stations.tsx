import { Radio } from "lucide-react";
import { Button } from "@guruplay/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import { usePlayer } from "@/context/PlayerContext";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
export default function Stations() {
  const catalog = useCatalog();
  const { playPlaylist } = usePlayer();
  const genres = [
    ...new Set(
      (catalog.data?.tracks || []).map((t) => t.genre).filter(Boolean),
    ),
  ].sort();
  return (
    <div className="p-5 md:p-8 pb-56">
      <h1 className="text-3xl font-bold mb-2">Stations</h1>
      <p className="text-muted-foreground mb-8">
        Explore a genre from the current catalog.
      </p>
      {catalog.isLoading ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState
          description={catalog.error.message}
          onRetry={() => void catalog.refetch()}
        />
      ) : genres.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {genres.map((genre) => {
            const tracks = catalog.data.tracks.filter((t) => t.genre === genre);
            return (
              <section
                key={genre}
                className="rounded-2xl border border-white/10 p-6"
              >
                <Radio className="h-8 w-8 text-primary mb-4" />
                <h2 className="font-bold text-xl">{genre}</h2>
                <p className="text-muted-foreground mt-2 mb-5">
                  {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                </p>
                <Button onClick={() => playPlaylist(tracks)}>
                  Play {genre}
                </Button>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Radio}
          title="New stations are on their way"
          description="Stations appear when approved music is available in the catalog."
        />
      )}
    </div>
  );
}

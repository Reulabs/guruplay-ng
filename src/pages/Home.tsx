import { Music2 } from "lucide-react";
import ArtistCard from "@/components/cards/ArtistCard";
import TrackCard from "@/components/cards/TrackCard";
import EmptyState from "@/components/fallbacks/EmptyState";
import ErrorState from "@/components/fallbacks/ErrorState";
import LoadingState from "@/components/fallbacks/LoadingState";
import HorizontalScroll from "@/components/sections/HorizontalScroll";
import Typography from "@/components/ui/typography";
import { useCatalog } from "@/hooks/use-catalog";

const Home = () => {
  const { data, isLoading, error, refetch } = useCatalog();

  if (isLoading)
    return (
      <div className="p-4 md:p-8">
        <LoadingState />
      </div>
    );
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorState description={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const tracks = data?.tracks || [];
  const artists = data?.artists || [];
  if (tracks.length === 0 && artists.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={Music2}
          title="The catalog is waiting for its first release"
          description="Approved artist uploads will appear here as soon as they are published."
        />
      </div>
    );
  }

  const popularTracks = [...tracks]
    .sort((a, b) => b.totalPlays - a.totalPlays)
    .slice(0, 6);

  return (
    <div className="space-y-10 p-4 pb-28 md:p-8">
      <section>
        <Typography as="h1" variant="2xl" weight="bold" className="mb-2">
          Discover independent music
        </Typography>
        <Typography variant="body" tone="muted">
          Newly approved releases from Guruplay artists.
        </Typography>
      </section>

      {tracks.length > 0 && (
        <section>
          <Typography as="h2" variant="xl" weight="bold" className="mb-4">
            New Releases
          </Typography>
          <div className="rounded-xl border border-white/5 bg-white/[0.04] p-1">
            {tracks.slice(0, 8).map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                index={index + 1}
                showIndex
              />
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <HorizontalScroll title="Approved Artists">
          {artists.map((artist) => (
            <div key={artist.id} className="min-w-[180px] max-w-[180px]">
              <ArtistCard artist={artist} tracks={tracks} />
            </div>
          ))}
        </HorizontalScroll>
      )}

      {popularTracks.length > 0 && (
        <section>
          <Typography as="h2" variant="xl" weight="bold" className="mb-4">
            Most Played
          </Typography>
          <div className="rounded-xl border border-white/5 bg-white/[0.04] p-1">
            {popularTracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                index={index + 1}
                showIndex
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;

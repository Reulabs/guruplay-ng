import { Link, useParams } from "react-router-dom";
import { ArrowLeft, UsersRound } from "lucide-react";
import ArtistHero from "@/components/artist/ArtistHero";
import ArtistTrackTable from "@/components/artist/ArtistTrackTable";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import { usePlayer } from "@/context/PlayerContext";
import { useCatalog } from "@/hooks/use-catalog";

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { playPlaylist } = usePlayer();
  const { data, isLoading, error, refetch } = useCatalog();

  if (isLoading)
    return (
      <div className="p-4 md:p-8">
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div className="p-4 md:p-8">
        <ErrorState description={error.message} onRetry={() => refetch()} />
      </div>
    );

  const artist = data?.artists.find((item) => item.id === id);
  if (!artist) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={UsersRound}
          title="Artist not found"
          description="This artist is unavailable or has not been approved."
        />
      </div>
    );
  }

  const tracks = (data?.tracks || []).filter(
    (track) => track.userId === artist.userId,
  );
  return (
    <div className="space-y-8 p-4 pb-28 md:p-8">
      <Link
        to="/artist"
        className="inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Artists
      </Link>
      <ArtistHero
        artist={artist}
        tracks={tracks}
        onPlay={() => playPlaylist(tracks)}
        onShuffle={() => {
          const ordered = [...tracks];
          for (let i = ordered.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
          }
          playPlaylist(ordered);
        }}
      />
      {tracks.length > 0 ? (
        <ArtistTrackTable
          tracks={tracks}
          onPlayTrack={(track) => playPlaylist([track])}
        />
      ) : (
        <EmptyState
          title="No published tracks"
          description="This artist has no approved releases yet."
        />
      )}
    </div>
  );
};

export default ArtistDetail;

import { useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import ArtistCardRow from "@/components/artist/ArtistCardRow";
import ArtistHero from "@/components/artist/ArtistHero";
import ArtistTrackTable from "@/components/artist/ArtistTrackTable";
import EmptyState from "@/components/fallbacks/EmptyState";
import ErrorState from "@/components/fallbacks/ErrorState";
import LoadingState from "@/components/fallbacks/LoadingState";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import { usePlayer } from "@/context/PlayerContext";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";

const Artist = () => {
  const { playPlaylist } = usePlayer();
  const { data, isLoading, error, refetch } = useCatalog();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const artists = useMemo(() => data?.artists || [], [data?.artists]);
  const tracks = data?.tracks || [];

  const genres = useMemo(
    () => ["All", ...new Set(artists.flatMap((artist) => artist.genres))],
    [artists],
  );
  const visibleArtists = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return artists.filter(
      (artist) =>
        (activeGenre === "All" || artist.genres.includes(activeGenre)) &&
        (!normalized ||
          artist.name.toLowerCase().includes(normalized) ||
          artist.genres.some((genre) =>
            genre.toLowerCase().includes(normalized),
          )),
    );
  }, [activeGenre, artists, query]);

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
  if (artists.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={UsersRound}
          title="No approved artists yet"
          description="Artist profiles appear here after an administrator approves their application."
        />
      </div>
    );
  }

  const featuredArtist = visibleArtists[0] || artists[0];
  const featuredTracks = tracks.filter(
    (track) => track.userId === featuredArtist.userId,
  );

  return (
    <div className="space-y-8 p-4 pb-28 md:p-8">
      <ArtistHero
        artist={featuredArtist}
        tracks={featuredTracks}
        onPlay={() => playPlaylist(featuredTracks)}
      />
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Typography as="h2" variant="h1" weight="bold">
              Artists
            </Typography>
            <Typography variant="body" tone="muted">
              Browse approved independent artists.
            </Typography>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists or genres"
              className="h-11 rounded-full border-white/10 bg-white/[0.06] pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold",
                activeGenre === genre
                  ? "bg-white text-black"
                  : "bg-white/[0.06] text-white/65",
              )}
            >
              {genre}
            </button>
          ))}
        </div>
        {visibleArtists.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleArtists.map((artist) => {
              const artistTracks = tracks.filter(
                (track) => track.userId === artist.userId,
              );
              return (
                <ArtistCardRow
                  key={artist.id}
                  artist={artist}
                  tracks={artistTracks}
                  onPlay={() => playPlaylist(artistTracks)}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No matching artists"
            description="Try a different name or genre."
            icon={Search}
          />
        )}
      </section>
      {featuredTracks.length > 0 && (
        <ArtistTrackTable
          title={`Popular by ${featuredArtist.name}`}
          tracks={featuredTracks}
          onPlayTrack={(track) => playPlaylist([track])}
        />
      )}
    </div>
  );
};

export default Artist;

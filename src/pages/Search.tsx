import { useMemo, useState } from "react";
import { Music2, Search as SearchIcon } from "lucide-react";
import ArtistCard from "@/components/cards/ArtistCard";
import TrackCard from "@/components/cards/TrackCard";
import EmptyState from "@/components/fallbacks/EmptyState";
import ErrorState from "@/components/fallbacks/ErrorState";
import LoadingState from "@/components/fallbacks/LoadingState";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import { useCatalog } from "@/hooks/use-catalog";

const genreColors = [
  "from-pink-500 to-rose-500",
  "from-orange-500 to-amber-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-teal-500",
  "from-emerald-500 to-green-500",
  "from-blue-500 to-sky-500",
];

const Search = () => {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, refetch } = useCatalog();
  const tracks = useMemo(() => data?.tracks || [], [data?.tracks]);
  const artists = useMemo(() => data?.artists || [], [data?.artists]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return {
      tracks: tracks.filter((track) =>
        [track.title, track.artist, track.genre].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      ),
      artists: artists.filter((artist) =>
        [artist.name, ...artist.genres].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      ),
    };
  }, [artists, query, tracks]);

  const genres = useMemo(
    () =>
      [...new Set(tracks.map((track) => track.genre).filter(Boolean))].sort(),
    [tracks],
  );

  return (
    <div className="p-6 pb-40">
      <div className="mb-8">
        <Typography as="h1" variant="h1" weight="bold" className="mb-4">
          Search
        </Typography>
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to listen to?"
            className="h-12 border-0 bg-muted pl-10 focus-visible:ring-1"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error.message} onRetry={() => refetch()} />
      ) : results ? (
        results.tracks.length === 0 && results.artists.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title={`No results for “${query.trim()}”`}
            description="Try another title, artist, or genre."
          />
        ) : (
          <div className="space-y-8">
            {results.tracks.length > 0 && (
              <section>
                <Typography as="h2" variant="h2" weight="bold" className="mb-4">
                  Songs
                </Typography>
                <div className="rounded-lg bg-card p-2">
                  {results.tracks.map((track, index) => (
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
            {results.artists.length > 0 && (
              <section>
                <Typography as="h2" variant="h2" weight="bold" className="mb-4">
                  Artists
                </Typography>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {results.artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="min-w-[160px] max-w-[160px]"
                    >
                      <ArtistCard artist={artist} tracks={tracks} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      ) : genres.length > 0 ? (
        <section>
          <Typography as="h2" variant="h2" weight="bold" className="mb-4">
            Browse Genres
          </Typography>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {genres.map((genre, index) => (
              <button
                key={genre}
                onClick={() => setQuery(genre)}
                className={`flex aspect-square items-end rounded-lg bg-gradient-to-br ${genreColors[index % genreColors.length]} p-4 text-left font-bold text-white transition-transform hover:scale-[1.02]`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={Music2}
          title="Nothing to search yet"
          description="Approved songs and artists will become searchable when they are published."
        />
      )}
    </div>
  );
};

export default Search;

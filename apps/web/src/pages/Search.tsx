import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import MusicSkeleton from "@guruplay/shared/fallbacks/MusicSkeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Music2, Search as SearchIcon } from "lucide-react";
import ArtistCard from "@/components/cards/ArtistCard";
import TrackCard from "@/components/cards/TrackCard";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import { Input } from "@guruplay/ui/input";
import Typography from "@guruplay/ui/typography";
import { useCatalog } from "@/hooks/use-catalog";
import { supabase } from "@/lib/supabase";

const genreColors = [
  "from-pink-500 to-rose-500",
  "from-orange-500 to-amber-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-teal-500",
  "from-emerald-500 to-green-500",
  "from-blue-500 to-sky-500",
];

const Search = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const setQuery = (value: string) =>
    setParams(value ? { q: value } : {}, { replace: true });
  const { data, isLoading, error, refetch } = useCatalog();
  const tracks = useMemo(() => data?.tracks || [], [data?.tracks]);
  const artists = useMemo(() => data?.artists || [], [data?.artists]);
  const normalizedQuery = query.trim();
  const trackSearch = useInfiniteQuery({
    queryKey: ["catalog-search", normalizedQuery],
    enabled: normalizedQuery.length >= 2,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await fetch(
        `/api/v1/catalog/search?q=${encodeURIComponent(normalizedQuery)}&page=${pageParam}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Search is temporarily unavailable.");
      return result as {
        items: Record<string, unknown>[];
        page: number;
        hasMore: boolean;
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    retry: 1,
  });

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized)
      return {
        tracks:
          params.get("sort") === "popular"
            ? [...tracks].sort((a, b) => b.totalPlays - a.totalPlays)
            : tracks,
        artists: [],
      };
    return {
      tracks: (trackSearch.data?.pages.flatMap((page) => page.items) || []).map(
        (item) => ({
          id: String(item.id),
          userId: String(item.user_id),
          title: String(item.title),
          artist: String(item.artist),
          duration: Number(item.duration) || 0,
          coverUrl: String(item.cover_url || ""),
          previewUrl: item.preview_object_path
            ? supabase.storage
                .from("song-previews")
                .getPublicUrl(String(item.preview_object_path)).data.publicUrl
            : "",
          availability: "ready" as const,
          genre: String(item.genre || ""),
          totalPlays: Number(item.total_plays) || 0,
          totalLikes: Number(item.total_likes) || 0,
          createdAt: String(item.created_at),
        }),
      ),
      artists: artists.filter((artist) =>
        [artist.name, ...artist.genres].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      ),
    };
  }, [artists, tracks, query, trackSearch.data, params]);

  const genres = useMemo(
    () =>
      [...new Set(tracks.map((track) => track.genre).filter(Boolean))].sort(),
    [tracks],
  );

  return (
    <div className="p-5 pb-48 md:p-9 md:pb-40">
      <div className="mb-8">
        <Typography as="h1" variant="h1" weight="bold" className="mb-4">
          Search
        </Typography>
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search songs and artists"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to listen to?"
            className="h-12 border-0 bg-muted pl-10 focus-visible:ring-1"
          />
        </div>
      </div>

      {isLoading || (normalizedQuery.length >= 2 && trackSearch.isLoading) ? (
        <MusicSkeleton rows count={6} />
      ) : error || trackSearch.error ? (
        <ErrorState
          description={
            (error || trackSearch.error)?.message || "Search failed."
          }
          onRetry={() => {
            void refetch();
            void trackSearch.refetch();
          }}
        />
      ) : results ? (
        results.tracks.length === 0 && results.artists.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title={`No results for “${query.trim()}”`}
            description="Try another title, artist, or genre."
          />
        ) : (
          <div className="space-y-8">
            {!normalizedQuery && genres.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Browse Genres</h2>
                <div className="flex flex-wrap gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setQuery(genre)}
                      className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/5"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </section>
            )}
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
                {trackSearch.hasNextPage && (
                  <button
                    className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm"
                    disabled={trackSearch.isFetchingNextPage}
                    onClick={() => void trackSearch.fetchNextPage()}
                  >
                    {trackSearch.isFetchingNextPage
                      ? "Loading…"
                      : "Load more songs"}
                  </button>
                )}
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

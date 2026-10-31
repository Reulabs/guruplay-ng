import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import TrackCard from "@/components/cards/TrackCard";
import ArtistCard from "@/components/cards/ArtistCard";
import MusicSkeleton from "@guruplay/shared/fallbacks/MusicSkeleton";
import CatalogFallback from "@guruplay/shared/fallbacks/CatalogFallback";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { MUSIC_GENRES } from "@/config/music";
import { Track } from "@/types/music";
import { cn } from "@guruplay/ui/utils";

function SongSection({
  title,
  tracks,
  href,
}: {
  title: string;
  tracks: Track[];
  href: string;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        <Link
          to={href}
          className="shrink-0 text-xs font-semibold text-white/45 transition-colors hover:text-white"
        >
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-5">
        {tracks.slice(0, 5).map((track) => (
          <TrackCard key={track.id} track={track} variant="tile" />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const catalog = useCatalog();
  const { user } = useAuth();
  const [genre, setGenre] = useState("All");
  const recommendations = useQuery({
    queryKey: ["recommendations", user?.id || "anonymous"],
    enabled: Boolean(catalog.data?.tracks.length),
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/v1/recommendations", {
        headers: data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {},
        signal: AbortSignal.timeout(15000),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("items" in result) ||
        !Array.isArray(result.items)
      )
        throw new Error("Recommendations are temporarily unavailable.");
      return result.items.flatMap((item: unknown) =>
        item &&
        typeof item === "object" &&
        "songId" in item &&
        typeof item.songId === "string"
          ? [item.songId]
          : [],
      );
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const tracks = catalog.data?.tracks || [];
  const artists = catalog.data?.artists || [];
  const genres = tracks.length
    ? [...new Set(tracks.map((track) => track.genre).filter(Boolean))]
    : [
        "Hip-Hop",
        "R&B",
        "Pop",
        "Gospel",
        "Electronic",
        "Jazz",
        "Ambient",
      ].filter((item) => MUSIC_GENRES.some((genre) => genre === item));
  const filtered =
    genre === "All" ? tracks : tracks.filter((track) => track.genre === genre);
  const recommended = (recommendations.data || []).flatMap((id) =>
    filtered.filter((track) => track.id === id),
  );
  const popular = [...filtered].sort((a, b) => b.totalPlays - a.totalPlays);

  return (
    <div className="space-y-9 px-5 pb-48 pt-7 md:px-9 md:pt-10">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium text-white/40">
            Independent artists. Original sounds.
          </p>
          <h1 className="text-3xl font-black tracking-[-0.04em] md:text-[2.5rem] md:leading-tight">
            Find your next favorite.
          </h1>
        </div>
        <Link
          to="/artist"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          Meet the artists <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <section
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#181818] px-5 py-6 sm:flex sm:items-center sm:justify-between sm:gap-6 md:px-7"
        aria-label="Guruplay membership"
      >
        <div className="relative flex items-center gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:flex">
            <Headphones className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Stay for the whole song.
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/45">
              Full-track listening. One monthly membership.
            </p>
          </div>
        </div>
        <Link
          to="/subscription"
          className="relative mt-5 inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:mt-0"
        >
          Explore membership
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
      <nav
        aria-label="Filter music by genre"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-thin md:mx-0 md:px-0"
      >
        {["All", ...genres].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={genre === item}
            onClick={() => setGenre(item)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              genre === item
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/15 text-white/65 hover:border-white/30 hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </nav>
      {catalog.isLoading ? (
        <section>
          <h2 className="mb-5 text-lg font-bold">New releases</h2>
          <MusicSkeleton count={10} />
        </section>
      ) : catalog.error ? (
        <CatalogFallback
          error={catalog.error.message}
          onRetry={() => void catalog.refetch()}
        />
      ) : filtered.length === 0 ? (
        <section>
          <h2 className="mb-5 text-lg font-bold">
            {genre === "All" ? "New releases" : genre}
          </h2>
          <CatalogFallback
            title={tracks.length ? `No ${genre} releases yet` : undefined}
            description={
              tracks.length
                ? "Try another genre, or check back for new music."
                : undefined
            }
            onRetry={() => void catalog.refetch()}
            onUpload={() => navigate("/upload")}
          />
        </section>
      ) : (
        <>
          <SongSection
            title={
              user && recommended.length ? "Picked for you" : "New releases"
            }
            tracks={user && recommended.length ? recommended : filtered}
            href={
              genre === "All"
                ? "/search"
                : `/search?q=${encodeURIComponent(genre)}`
            }
          />
          {popular.some((track) => track.totalPlays > 0) && (
            <SongSection
              title="Most played"
              tracks={popular}
              href="/search?sort=popular"
            />
          )}
          {user && recommended.length > 0 && (
            <SongSection
              title="Recently added"
              tracks={filtered}
              href="/search"
            />
          )}
          {recommendations.error && (
            <p className="text-xs text-white/45">
              Personal picks are unavailable right now. You can still explore
              the latest releases.
            </p>
          )}
        </>
      )}
      {artists.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Artists to know</h2>
            <Link
              to="/artist"
              className="text-xs font-semibold text-white/45 hover:text-white"
            >
              View all ↗
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {artists.slice(0, 5).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} tracks={tracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

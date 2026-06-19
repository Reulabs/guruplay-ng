import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { artists, tracks, albums } from "@/data/mockData";
import { usePlayer } from "@/context/PlayerContext";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import ArtistHero from "@/components/artist/ArtistHero";
import ArtistCardRow from "@/components/artist/ArtistCardRow";
import ArtistTrackTable from "@/components/artist/ArtistTrackTable";

const Artist = () => {
  const { playPlaylist } = usePlayer();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const genres = useMemo(
    () => [
      "All",
      ...Array.from(new Set(artists.flatMap((artist) => artist.genres))),
    ],
    [],
  );

  const visibleArtists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return artists.filter((artist) => {
      const matchesGenre =
        activeGenre === "All" || artist.genres.includes(activeGenre);
      const matchesQuery =
        !normalizedQuery ||
        artist.name.toLowerCase().includes(normalizedQuery) ||
        artist.genres.some((genre) =>
          genre.toLowerCase().includes(normalizedQuery),
        );

      return matchesGenre && matchesQuery;
    });
  }, [activeGenre, query]);

  const featuredArtist = visibleArtists[0] || artists[0];
  const featuredTracks = tracks.filter(
    (track) => track.artist === featuredArtist.name,
  );
  const artistAlbums = albums.filter(
    (album) => album.artist === featuredArtist.name,
  );

  return (
    <div className="space-y-8 p-4 pb-28 md:p-8">
      <ArtistHero
        artist={featuredArtist}
        tracks={featuredTracks}
        albums={artistAlbums}
        onPlay={() => playPlaylist(featuredTracks)}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Typography as="h2" variant="h1" weight="bold">
              Artists
            </Typography>
            <Typography variant="body" tone="muted">
              Browse independent voices and curated Guruplay picks.
            </Typography>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists or genres"
              className="h-11 rounded-full border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                activeGenre === genre
                  ? "bg-white text-black"
                  : "bg-white/[0.06] text-white/65 hover:bg-white/[0.1] hover:text-white",
              )}
            >
              {genre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleArtists.map((artist) => {
            const artistTracks = tracks.filter(
              (track) => track.artist === artist.name,
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

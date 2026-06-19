import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Disc3 } from "lucide-react";
import { albums, artists, tracks } from "@/data/mockData";
import { usePlayer } from "@/context/PlayerContext";
import ArtistHero from "@/components/artist/ArtistHero";
import ArtistTrackTable from "@/components/artist/ArtistTrackTable";
import Typography from "@/components/ui/typography";

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { playPlaylist } = usePlayer();
  const artist = artists.find((item) => item.id === id);

  const artistTracks = useMemo(
    () => tracks.filter((track) => track.artist === artist?.name),
    [artist?.name],
  );

  const artistAlbums = useMemo(
    () => albums.filter((album) => album.artist === artist?.name),
    [artist?.name],
  );

  if (!artist) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <Typography as="h1" variant="h2" weight="bold">
            Artist not found
          </Typography>
          <Link
            to="/artist"
            className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
          >
            Back to artists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 pb-28 md:p-8">
      <Link
        to="/artist"
        className="inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Artists
      </Link>

      <ArtistHero
        artist={artist}
        tracks={artistTracks}
        albums={artistAlbums}
        onPlay={() => playPlaylist(artistTracks)}
        onShuffle={() => playPlaylist(artistTracks)}
      />

      <ArtistTrackTable
        tracks={artistTracks}
        onPlayTrack={(track) => playPlaylist([track])}
      />

      <section>
        <Typography as="h2" variant="h2" weight="bold" className="mb-4">
          Albums
        </Typography>
        {artistAlbums.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
            {artistAlbums.map((album) => (
              <button
                key={album.id}
                onClick={() => playPlaylist(album.tracks)}
                className="group text-left"
              >
                <img
                  src={album.coverUrl}
                  alt={album.name}
                  className="aspect-square w-full rounded-2xl object-cover transition-transform group-hover:scale-[1.02]"
                />
                <Typography
                  variant="body"
                  weight="bold"
                  className="mt-3"
                  truncate
                >
                  {album.name}
                </Typography>
                <Typography
                  variant="caption"
                  className="mt-1 flex items-center gap-1 text-white/45"
                >
                  <Disc3 className="h-3.5 w-3.5" />
                  {album.year}
                </Typography>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/55">
            No albums available yet.
          </div>
        )}
      </section>
    </div>
  );
};

export default ArtistDetail;

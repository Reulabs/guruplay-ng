import { Play } from "lucide-react";
import { Artist, Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { useNavigate } from "react-router-dom";

interface ArtistCardProps {
  artist: Artist;
  tracks: Track[];
}

const ArtistCard = ({ artist, tracks }: ArtistCardProps) => {
  const { playPlaylist } = usePlayer();
  const navigate = useNavigate();

  const artistTracks = tracks.filter((track) => track.userId === artist.userId);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artistTracks.length > 0) {
      playPlaylist(artistTracks);
    }
  };

  return (
    <div
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="group p-4 rounded-md bg-card hover:bg-secondary/80 transition-all duration-300 cursor-pointer"
    >
      <div className="relative mb-4">
        {artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full aspect-square rounded-full object-cover shadow-lg"
          />
        ) : (
          <div
            className="aspect-square w-full rounded-full bg-white/[0.06]"
            aria-hidden
          />
        )}
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 p-3 rounded-full bg-primary text-primary-foreground shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
        >
          <Play className="h-5 w-5 fill-current" />
        </button>
      </div>
      <h3 className="font-semibold text-sm truncate mb-1">{artist.name}</h3>
      <p className="text-xs text-muted-foreground">Artist</p>
    </div>
  );
};

export default ArtistCard;

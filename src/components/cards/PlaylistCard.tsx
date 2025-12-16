import { Play } from 'lucide-react';
import { Playlist } from '@/data/mockData';
import { usePlayer } from '@/context/PlayerContext';
import { useNavigate } from 'react-router-dom';

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard = ({ playlist }: PlaylistCardProps) => {
  const { playPlaylist } = usePlayer();
  const navigate = useNavigate();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPlaylist(playlist.tracks);
  };

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="group p-3 rounded-lg bg-card hover:bg-secondary transition-colors cursor-pointer"
    >
      <div className="relative mb-3">
        <img
          src={playlist.coverUrl}
          alt={playlist.name}
          className="w-full aspect-square rounded object-cover"
        />
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 p-2.5 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-medium text-sm truncate">{playlist.name}</h3>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {playlist.description}
      </p>
    </div>
  );
};

export default PlaylistCard;

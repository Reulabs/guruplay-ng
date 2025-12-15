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
      className="group p-4 rounded-lg bg-card hover:bg-muted/50 transition-all cursor-pointer"
    >
      <div className="relative mb-4">
        <img
          src={playlist.coverUrl}
          alt={playlist.name}
          className="w-full aspect-square rounded-md object-cover shadow-lg"
        />
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 p-3 rounded-full gradient-primary text-primary-foreground opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg hover:scale-105"
        >
          <Play className="h-5 w-5 ml-0.5" />
        </button>
      </div>
      <h3 className="font-semibold truncate">{playlist.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
        {playlist.description}
      </p>
    </div>
  );
};

export default PlaylistCard;

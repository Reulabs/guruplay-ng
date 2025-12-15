import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { Track } from '@/data/mockData';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TrackCard = ({ track, index, showIndex = false }: TrackCardProps) => {
  const { currentTrack, isPlaying, play, pause } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isCurrentTrack && isPlaying) {
      pause();
    } else {
      play(track);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer',
        isCurrentTrack && 'bg-muted/50'
      )}
      onClick={handleClick}
    >
      {/* Index or Play Button */}
      <div className="w-8 flex items-center justify-center">
        {showIndex && (
          <span className={cn(
            'text-sm tabular-nums group-hover:hidden',
            isCurrentTrack ? 'text-primary' : 'text-muted-foreground'
          )}>
            {index}
          </span>
        )}
        <button className={cn(
          'transition-opacity',
          showIndex ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
        )}>
          {isCurrentTrack && isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Cover */}
      <img
        src={track.coverUrl}
        alt={track.title}
        className="h-10 w-10 rounded object-cover"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isCurrentTrack && 'text-primary'
        )}>
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Album */}
      <p className="hidden md:block text-sm text-muted-foreground truncate w-40">
        {track.album}
      </p>

      {/* Duration */}
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDuration(track.duration)}
      </span>

      {/* More Button */}
      <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
};

export default TrackCard;

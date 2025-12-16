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
        'group grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)] gap-4 items-center px-4 py-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer',
        isCurrentTrack && 'bg-secondary/60'
      )}
      onClick={handleClick}
    >
      {/* Index or Play Button */}
      <div className="flex items-center justify-center w-4">
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
            <Play className="h-4 w-4 fill-current" />
          )}
        </button>
      </div>

      {/* Cover & Info */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="h-10 w-10 rounded object-cover"
        />
        <div className="min-w-0">
          <p className={cn(
            'text-sm font-medium truncate hover:underline',
            isCurrentTrack && 'text-primary'
          )}>
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate hover:underline hover:text-foreground">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Album */}
      <p className="hidden md:block text-sm text-muted-foreground truncate hover:underline hover:text-foreground">
        {track.album}
      </p>

      {/* Duration & More */}
      <div className="flex items-center justify-end gap-4">
        <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
};

export default TrackCard;

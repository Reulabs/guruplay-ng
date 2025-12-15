import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX,
  ListMusic,
  Heart
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerBar = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-player border-t border-border flex items-center justify-center text-muted-foreground text-sm z-50">
        Select a track to play
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-player border-t border-border z-50">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 w-[30%]">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="h-14 w-14 rounded-md object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className={cn(
              'hidden sm:block p-2 transition-colors',
              liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-1 w-[40%] max-w-md">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={cn(
                'hidden sm:block p-2 transition-colors',
                shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={previous}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={toggle}
              className="p-2 rounded-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={toggleRepeat}
              className={cn(
                'hidden sm:block p-2 transition-colors',
                repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="hidden sm:flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={1}
              onValueChange={([value]) => seek(value)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Queue */}
        <div className="hidden md:flex items-center gap-2 justify-end w-[30%]">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              'p-2 transition-colors',
              showQueue ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListMusic className="h-4 w-4" />
          </button>
          <button
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={([value]) => setVolume(value / 100)}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;

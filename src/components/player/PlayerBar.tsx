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
      <div className="fixed bottom-0 left-0 right-0 h-[96px] bg-[#07080f] border-t border-white/10 flex items-center justify-center text-muted-foreground text-sm z-50">
        Select a track to play
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[96px] bg-[#07080f] border-t border-white/10 z-50">
      <div className="h-full px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 w-[28%]">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="h-16 w-16 rounded-3xl object-cover border border-white/10"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className={cn(
              'hidden sm:inline-flex p-2 rounded-full transition-colors',
              liked ? 'bg-white/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 w-[44%]">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleShuffle}
              className={cn(
                'hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                shuffle ? 'bg-white/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={previous}
              className="h-11 w-11 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center justify-center"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={toggle}
              className="h-14 w-14 rounded-full bg-white text-[#0b0b10] shadow-lg shadow-black/25 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={next}
              className="h-11 w-11 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center justify-center"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={toggleRepeat}
              className={cn(
                'hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                repeat !== 'off' ? 'bg-white/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 w-full">
            <span className="text-[11px] text-muted-foreground w-10 text-right tabular-nums">{formatTime(progress)}</span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={1}
              onValueChange={([value]) => seek(value)}
              className="flex-1"
            />
            <span className="text-[11px] text-muted-foreground w-10 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 justify-end w-[28%]">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              'rounded-full px-4 py-2 text-sm transition-colors',
              showQueue ? 'bg-white text-[#0b0b10]' : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
            )}
          >
            <ListMusic className="h-4 w-4 inline-block mr-2" />
            Queue
          </button>
          <button
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            className="h-11 w-11 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center justify-center"
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

import { Clock, Heart, Play } from "lucide-react";
import { Track } from "@/types/music";
import Typography from "@/components/ui/typography";

interface ArtistTrackTableProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  title?: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const ArtistTrackTable = ({
  tracks,
  onPlayTrack,
  title = "Top Tracks",
}: ArtistTrackTableProps) => {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Typography as="h2" variant="h2" weight="bold">
          {title}
        </Typography>
        <button className="text-sm font-bold text-white/45 hover:text-white">
          View all
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
        <div className="grid grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_100px_44px] gap-4 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white/35">
          <span>#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="hidden text-right md:block">
            <Clock className="ml-auto h-4 w-4" />
          </span>
          <span />
        </div>
        {tracks.map((track, index) => (
          <button
            key={track.id}
            onClick={() => onPlayTrack(track)}
            className="group grid w-full grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_100px_44px] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
          >
            <span className="text-sm text-white/45 group-hover:hidden">
              {index + 1}
            </span>
            <Play className="hidden h-4 w-4 fill-current text-white group-hover:block" />
            <span className="flex min-w-0 items-center gap-3">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <span className="h-12 w-12 rounded-lg bg-white/[0.06]" />
              )}
              <span className="min-w-0">
                <Typography variant="body" weight="bold" truncate>
                  {track.title}
                </Typography>
                <Typography
                  variant="caption"
                  className="text-white/45"
                  truncate
                >
                  {track.artist}
                </Typography>
              </span>
            </span>
            <Typography
              variant="body-sm"
              className="hidden text-white/55 md:block"
              truncate
            >
              {track.genre || "Uncategorized"}
            </Typography>
            <Typography
              variant="body-sm"
              className="hidden text-right text-white/55 md:block"
            >
              {formatDuration(track.duration)}
            </Typography>
            <Heart className="h-4 w-4 text-white/35 transition-colors group-hover:text-white" />
          </button>
        ))}
      </div>
    </section>
  );
};

export default ArtistTrackTable;

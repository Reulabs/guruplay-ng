import { Play, UsersRound, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Artist, Track } from '@/data/mockData';
import Typography from '@/components/ui/typography';

interface ArtistCardRowProps {
  artist: Artist;
  tracks: Track[];
  onPlay: () => void;
}

const ArtistCardRow = ({ artist, tracks, onPlay }: ArtistCardRowProps) => {
  return (
    <article className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]">
      <div className="flex gap-4">
        <Link to={`/artist/${artist.id}`} className="shrink-0">
          <img src={artist.imageUrl} alt={artist.name} className="h-24 w-24 rounded-2xl object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/artist/${artist.id}`}>
            <Typography variant="title" weight="bold" truncate className="hover:underline">
              {artist.name}
            </Typography>
          </Link>
          <Typography variant="body-sm" tone="muted" className="mt-1" truncate>
            {artist.genres.join(' / ')}
          </Typography>
          <div className="mt-4 flex items-center gap-3 text-xs text-white/45">
            <span className="flex items-center gap-1">
              <Music2 className="h-3.5 w-3.5" />
              {tracks.length} songs
            </span>
            <span className="flex items-center gap-1">
              <UsersRound className="h-3.5 w-3.5" />
              {Math.max(tracks.length * 1284, 2400).toLocaleString()} listeners
            </span>
          </div>
        </div>
        <button
          onClick={onPlay}
          disabled={tracks.length === 0}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all hover:scale-105 disabled:opacity-30 group-hover:opacity-100"
          aria-label={`Play ${artist.name}`}
        >
          <Play className="h-5 w-5 fill-current" />
        </button>
      </div>
    </article>
  );
};

export default ArtistCardRow;

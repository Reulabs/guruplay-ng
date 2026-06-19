import { Play, Shuffle, Radio, Share2, MoreHorizontal, Plus } from 'lucide-react';
import { Artist, Album, Track } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import Typography from '@/components/ui/typography';

interface ArtistHeroProps {
  artist: Artist;
  tracks: Track[];
  albums: Album[];
  onPlay: () => void;
  onShuffle?: () => void;
}

const getListenerCount = (tracks: Track[]) => Math.max(tracks.length * 347291, 1200);

const ArtistHero = ({ artist, tracks, albums, onPlay, onShuffle }: ArtistHeroProps) => {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="relative min-h-[420px] p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-55 md:w-[72%]"
        />
        <div className="relative z-10 flex min-h-[340px] max-w-3xl flex-col justify-end">
          <Typography variant="eyebrow" weight="bold" className="text-white/55">
            Verified artist
          </Typography>
          <Typography as="h1" variant="display" weight="black" className="mt-4 text-white md:text-6xl">
            {artist.name}
          </Typography>
          <Typography variant="title" className="mt-3 max-w-xl text-white/70">
            {artist.genres.join(' / ')} artist with {getListenerCount(tracks).toLocaleString()} monthly listeners.
          </Typography>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onPlay} className="h-12 rounded-full bg-white px-7 font-bold text-black hover:bg-white/90" disabled={tracks.length === 0}>
              <Play className="h-4 w-4 fill-current" />
              Play
            </Button>
            <Button onClick={onShuffle || onPlay} variant="secondary" className="h-12 rounded-full border border-white/10 bg-white/[0.08] px-6 font-bold text-white hover:bg-white/[0.12]" disabled={tracks.length === 0}>
              <Shuffle className="h-4 w-4" />
              Shuffle
            </Button>
            <div className="ml-auto hidden items-center gap-6 text-white/80 md:flex">
              <button className="grid gap-1 text-center text-xs font-bold hover:text-white">
                <Plus className="mx-auto h-5 w-5" />
                Follow
              </button>
              <button className="grid gap-1 text-center text-xs font-bold hover:text-white">
                <Radio className="mx-auto h-5 w-5" />
                Artist radio
              </button>
              <button className="grid gap-1 text-center text-xs font-bold hover:text-white">
                <Share2 className="mx-auto h-5 w-5" />
                Share
              </button>
              <button className="grid gap-1 text-center text-xs font-bold hover:text-white">
                <MoreHorizontal className="mx-auto h-5 w-5" />
                More
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-3 text-sm text-white/55">
            <span>{tracks.length} top tracks</span>
            <span>{albums.length} albums</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistHero;

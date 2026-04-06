import { useMemo } from 'react';
import { Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PlaylistCard from '@/components/cards/PlaylistCard';
import HorizontalScroll from '@/components/sections/HorizontalScroll';
import { usePlayer } from '@/context/PlayerContext';

const fallbackTrending = [
  {
    id: 'trending-1',
    title: 'One More Stranger',
    description: 'Anna Ellison, Claire Hudson',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=520&h=520&fit=crop',
  },
  {
    id: 'trending-2',
    title: 'Cloud Nine',
    description: 'Anna Ellison, Claire Hudson',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=520&h=520&fit=crop',
  },
  {
    id: 'trending-3',
    title: 'Desired Games',
    description: 'Anna Ellison, Claire Hudson',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=520&h=520&fit=crop',
  },
  {
    id: 'trending-4',
    title: 'Bloodlust 2',
    description: 'Anna Ellison, Claire Hudson',
    image: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=520&h=520&fit=crop',
  },
  {
    id: 'trending-5',
    title: 'Until I Met You 2',
    description: 'Anna Ellison, Claire Hudson',
    image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=520&h=520&fit=crop',
  },
];

const fallbackRecommended = [
  {
    id: 'rec-1',
    name: 'Nova Pulse',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=520&h=520&fit=crop',
  },
  {
    id: 'rec-2',
    name: 'Midnight Echo',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=520&h=520&fit=crop',
  },
  {
    id: 'rec-3',
    name: 'Luna Vibe',
    imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=520&h=520&fit=crop',
  },
  {
    id: 'rec-4',
    name: 'Aura Rhythm',
    imageUrl: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=520&h=520&fit=crop',
  },
  {
    id: 'rec-5',
    name: 'Neon Dream',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=520&h=520&fit=crop',
  },
];

const Home = () => {
  const { playPlaylist } = usePlayer();
  const trendingArtists = useMemo(() => fallbackTrending, []);

  return (
    <div className="p-6 pb-40">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">Discover the sounds that move you.</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">
            Explore playlists, artists, albums, and mood-driven music in a sleek listening experience.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[420px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for Song, Artists, Playlists and More..."
              className="pl-12 pr-4 h-12 rounded-full bg-[#07090f] border border-white/10 text-foreground"
            />
          </div>
          <button className="flex items-center gap-3 rounded-full bg-[#090b13] border border-white/10 px-4 py-3 text-sm text-foreground hover:bg-white/5 transition-colors">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 text-sm font-semibold text-white">D</span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs text-muted-foreground">Hello,</span>
              <span className="block font-semibold">David</span>
            </span>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Trending Artists</h2>
            <p className="text-sm text-muted-foreground">The artists people are listening to right now.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button className="rounded-full border border-white/10 bg-[#090b13] p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-full border border-white/10 bg-[#090b13] p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {trendingArtists.map((artist) => (
            <div key={artist.id} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#05070f] shadow-[0_35px_120px_-60px_rgba(0,0,0,0.6)]">
              <img
                src={artist.image}
                alt={artist.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="relative p-6 h-full flex flex-col justify-end gap-3">
                <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Trending</span>
                <h3 className="text-lg font-semibold text-white">{artist.title}</h3>
                <p className="text-sm text-muted-foreground">{artist.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Recommended Artists</h2>
            <p className="text-sm text-muted-foreground">Fresh picks just for your next listening session.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button className="rounded-full border border-white/10 bg-[#090b13] p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-full border border-white/10 bg-[#090b13] p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <HorizontalScroll title="" description="">
          {fallbackRecommended.map((artist) => (
            <div key={artist.id} className="min-w-[180px] max-w-[180px]">
              <div className="group rounded-3xl overflow-hidden bg-[#090b13] border border-white/10 shadow-lg shadow-black/20">
                <img src={artist.imageUrl} alt={artist.name} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="p-4">
                  <p className="text-sm font-semibold text-white">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">Popular artist</p>
                </div>
              </div>
            </div>
          ))}
        </HorizontalScroll>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Made for You</h2>
            <p className="text-sm text-muted-foreground">Handpicked playlists to keep your queue moving.</p>
          </div>
          <button
            onClick={() => playPlaylist([])}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/15 transition-colors"
          >
            Play all
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <PlaylistCard
              key={`hero-playlist-${index}`}
              playlist={{
                id: `hero-${index}`,
                name: `Mix ${index + 1}`,
                description: 'A set of fresh beats and charts you love.',
                coverUrl: `https://images.unsplash.com/photo-15${index * 10}?w=520&h=520&fit=crop`,
                tracks: [],
                createdBy: 'Miraculous'
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;

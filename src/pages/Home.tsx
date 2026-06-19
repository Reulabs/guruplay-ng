import { Play } from 'lucide-react';
import { playlists, tracks, artists } from '@/data/mockData';
import PlaylistCard from '@/components/cards/PlaylistCard';
import ArtistCard from '@/components/cards/ArtistCard';
import TrackCard from '@/components/cards/TrackCard';
import HorizontalScroll from '@/components/sections/HorizontalScroll';
import { usePlayer } from '@/context/PlayerContext';
import Typography from '@/components/ui/typography';
import FeaturedSpotlight from '@/components/sections/FeaturedSpotlight';

const Home = () => {
  const { playPlaylist } = usePlayer();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickPicks = playlists.slice(0, 6);

  return (
    <div className="space-y-10 p-4 pb-28 md:p-8">
      <FeaturedSpotlight tracks={tracks} />

      <div>
        <Typography as="h1" variant="2xl" weight="bold" className="mb-6">
          {getGreeting()}
        </Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickPicks.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => playPlaylist(playlist.tracks)}
              className="group flex items-center gap-4 overflow-hidden rounded-xl border border-white/5 bg-white/[0.06] text-left h-14 transition-colors hover:border-white/10 hover:bg-white/[0.1]"
            >
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="h-14 w-14 object-cover"
              />
              <Typography variant="sm" weight="semibold" className="flex-1 truncate pr-2">
                {playlist.name}
              </Typography>
              <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <HorizontalScroll title="Made for You">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="min-w-[180px] max-w-[180px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>

      <section className="mb-10">
        <Typography as="h2" variant="xl" weight="bold" className="mb-4">
          Recently Played
        </Typography>
        <div className="rounded-xl border border-white/5 bg-white/[0.04] p-1">
          {tracks.slice(0, 5).map((track, index) => (
            <TrackCard key={track.id} track={track} index={index + 1} showIndex />
          ))}
        </div>
      </section>

      <HorizontalScroll title="Popular Artists">
        {artists.map((artist) => (
          <div key={artist.id} className="min-w-[180px] max-w-[180px]">
            <ArtistCard artist={artist} />
          </div>
        ))}
      </HorizontalScroll>

      <HorizontalScroll title="New Releases">
        {playlists.slice().reverse().map((playlist) => (
          <div key={playlist.id} className="min-w-[180px] max-w-[180px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  );
};

export default Home;

import { Play } from 'lucide-react';
import { playlists, tracks, artists } from '@/data/mockData';
import PlaylistCard from '@/components/cards/PlaylistCard';
import ArtistCard from '@/components/cards/ArtistCard';
import TrackCard from '@/components/cards/TrackCard';
import HorizontalScroll from '@/components/sections/HorizontalScroll';
import { usePlayer } from '@/context/PlayerContext';

const Home = () => {
  const { playPlaylist } = usePlayer();
  const hasMusicOnPlatform = tracks.length > 0 || playlists.length > 0 || artists.length > 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickPicks = playlists.slice(0, 6);

  return (
    <div className="p-6 pb-32">
      {/* Header */}
      <h1 className="text-3xl font-bold">Guruplay</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        {getGreeting()}. Discover fresh sounds, follow artists, and keep your listening journey in one place.
      </p>

      {!hasMusicOnPlatform && (
        <section className="mb-10 rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold">Guruplay</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No music is available on the platform yet. Check back soon, your next favorite track is on the way.
          </p>
        </section>
      )}

      {/* Quick Picks Grid */}
      {quickPicks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {quickPicks.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => playPlaylist(playlist.tracks)}
              className="group flex items-center gap-4 bg-secondary/60 hover:bg-secondary rounded-md overflow-hidden transition-colors text-left h-14"
            >
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="h-14 w-14 object-cover"
              />
              <span className="flex-1 font-semibold text-sm truncate pr-2">{playlist.name}</span>
              <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Made for You */}
      <HorizontalScroll
        title="Made for You"
        description="Personalized playlists built for your taste on Guruplay."
      >
        {playlists.map((playlist) => (
          <div key={playlist.id} className="min-w-[180px] max-w-[180px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* Recently Played */}
      {tracks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-1">Guruplay</h2>
          <p className="text-sm text-muted-foreground mb-4">Recently played tracks picked from your listening history.</p>
          <div className="bg-card/50 rounded-lg">
            {tracks.slice(0, 5).map((track, index) => (
              <TrackCard key={track.id} track={track} index={index + 1} showIndex />
            ))}
          </div>
        </section>
      )}

      {/* Popular Artists */}
      <HorizontalScroll
        title="Popular Artists"
        description="Trending artists listeners are playing most right now."
      >
        {artists.map((artist) => (
          <div key={artist.id} className="min-w-[180px] max-w-[180px]">
            <ArtistCard artist={artist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* New Releases */}
      <HorizontalScroll
        title="New Releases"
        description="Fresh drops and latest releases added to Guruplay."
      >
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

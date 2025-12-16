import { playlists, tracks, artists } from '@/data/mockData';
import PlaylistCard from '@/components/cards/PlaylistCard';
import ArtistCard from '@/components/cards/ArtistCard';
import TrackCard from '@/components/cards/TrackCard';
import HorizontalScroll from '@/components/sections/HorizontalScroll';
import { usePlayer } from '@/context/PlayerContext';

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
    <div className="p-6 pb-32">
      {/* Header */}
      <h1 className="text-2xl font-semibold mb-6">{getGreeting()}</h1>

      {/* Quick Picks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-8">
        {quickPicks.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => playPlaylist(playlist.tracks)}
            className="flex items-center gap-3 bg-secondary hover:bg-secondary/80 rounded overflow-hidden transition-colors text-left"
          >
            <img
              src={playlist.coverUrl}
              alt={playlist.name}
              className="h-12 w-12 object-cover"
            />
            <span className="font-medium text-sm truncate pr-3">{playlist.name}</span>
          </button>
        ))}
      </div>

      {/* Made for You */}
      <HorizontalScroll title="Made for You">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="min-w-[160px] max-w-[160px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* Recently Played */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Recently Played</h2>
        <div className="bg-card rounded-lg">
          {tracks.slice(0, 5).map((track, index) => (
            <TrackCard key={track.id} track={track} index={index + 1} showIndex />
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <HorizontalScroll title="Popular Artists">
        {artists.map((artist) => (
          <div key={artist.id} className="min-w-[140px] max-w-[140px]">
            <ArtistCard artist={artist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* New Releases */}
      <HorizontalScroll title="New Releases">
        {playlists.slice().reverse().map((playlist) => (
          <div key={playlist.id} className="min-w-[160px] max-w-[160px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  );
};

export default Home;

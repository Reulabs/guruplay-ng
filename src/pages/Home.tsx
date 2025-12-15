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

  // Quick picks - first 6 playlists as large cards
  const quickPicks = playlists.slice(0, 6);

  return (
    <div className="p-6 pb-40">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">{getGreeting()}</h1>

      {/* Quick Picks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {quickPicks.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => playPlaylist(playlist.tracks)}
            className="flex items-center gap-4 bg-muted/30 hover:bg-muted/50 rounded-md overflow-hidden transition-colors group"
          >
            <img
              src={playlist.coverUrl}
              alt={playlist.name}
              className="h-16 w-16 object-cover"
            />
            <span className="font-semibold truncate pr-4">{playlist.name}</span>
          </button>
        ))}
      </div>

      {/* Made for You */}
      <HorizontalScroll title="Made for You">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="min-w-[180px] max-w-[180px]">
            <PlaylistCard playlist={playlist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* Recently Played */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Recently Played</h2>
        <div className="bg-card rounded-lg p-2">
          {tracks.slice(0, 5).map((track, index) => (
            <TrackCard key={track.id} track={track} index={index + 1} showIndex />
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <HorizontalScroll title="Popular Artists">
        {artists.map((artist) => (
          <div key={artist.id} className="min-w-[160px] max-w-[160px]">
            <ArtistCard artist={artist} />
          </div>
        ))}
      </HorizontalScroll>

      {/* New Releases */}
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

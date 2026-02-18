import { useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { tracks, artists, playlists, genres, moods } from '@/data/mockData';
import TrackCard from '@/components/cards/TrackCard';
import PlaylistCard from '@/components/cards/PlaylistCard';
import ArtistCard from '@/components/cards/ArtistCard';

const Search = () => {
  const [query, setQuery] = useState('');
  const hasMusicOnPlatform = tracks.length > 0 || artists.length > 0 || playlists.length > 0;

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;

    const q = query.toLowerCase();
    return {
      tracks: tracks.filter(
        t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      ),
      artists: artists.filter(a => a.name.toLowerCase().includes(q)),
      playlists: playlists.filter(
        p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      ),
    };
  }, [query]);

  return (
    <div className="p-6 pb-40">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Guruplay</h1>
        <p className="text-muted-foreground mt-1 mb-4">
          Search songs, artists, and playlists across the Guruplay platform.
        </p>
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="pl-10 h-12 bg-muted border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchResults ? (
        <div className="space-y-8">
          {/* Tracks */}
          {searchResults.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Songs</h2>
              <div className="bg-card rounded-lg p-2">
                {searchResults.tracks.slice(0, 5).map((track, index) => (
                  <TrackCard key={track.id} track={track} index={index + 1} showIndex />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {searchResults.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Artists</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {searchResults.artists.map((artist) => (
                  <div key={artist.id} className="min-w-[160px] max-w-[160px]">
                    <ArtistCard artist={artist} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {searchResults.playlists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {searchResults.tracks.length === 0 &&
            searchResults.artists.length === 0 &&
            searchResults.playlists.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
        </div>
      ) : (
        /* Browse Categories */
        <div className="space-y-8">
          {!hasMusicOnPlatform && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <h2 className="text-xl font-semibold">Guruplay</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                There is no music on the platform yet. New songs and artists will appear here soon.
              </p>
            </div>
          )}

          {/* Genres */}
          <section>
            <h2 className="text-xl font-bold mb-1">Guruplay</h2>
            <p className="text-sm text-muted-foreground mb-4">Browse genres and find the sounds that match your vibe.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genres.map((genre) => (
                <div
                  key={genre.id}
                  className={`aspect-square rounded-lg bg-gradient-to-br ${genre.color} p-4 flex items-end cursor-pointer hover:scale-105 transition-transform`}
                >
                  <span className="font-bold text-white">{genre.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Moods */}
          <section>
            <h2 className="text-xl font-bold mb-1">Guruplay</h2>
            <p className="text-sm text-muted-foreground mb-4">Browse by mood and jump into playlists that fit your moment.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {moods.map((mood) => (
                <div
                  key={mood.id}
                  className={`rounded-lg bg-gradient-to-br ${mood.color} p-4 flex items-center justify-center gap-2 cursor-pointer hover:scale-105 transition-transform`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="font-bold text-white">{mood.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Search;

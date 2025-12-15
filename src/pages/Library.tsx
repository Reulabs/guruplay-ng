import { useState } from 'react';
import { Grid, List, Plus } from 'lucide-react';
import { playlists, tracks } from '@/data/mockData';
import PlaylistCard from '@/components/cards/PlaylistCard';
import TrackCard from '@/components/cards/TrackCard';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'playlists' | 'albums' | 'artists';

const Library = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'playlists', label: 'Playlists' },
    { value: 'albums', label: 'Albums' },
    { value: 'artists', label: 'Artists' },
  ];

  // Mock liked songs
  const likedSongs = tracks.slice(0, 8);

  return (
    <div className="p-6 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Library</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f.value
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground hover:bg-muted/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liked Songs Section */}
      <section className="mb-8">
        <div className="flex items-center gap-4 p-4 rounded-lg gradient-primary mb-4 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="flex-1">
            <p className="text-sm text-primary-foreground/80">Playlist</p>
            <h2 className="text-2xl font-bold text-primary-foreground">Liked Songs</h2>
            <p className="text-sm text-primary-foreground/80 mt-1">{likedSongs.length} songs</p>
          </div>
        </div>
      </section>

      {/* Library Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg p-2">
          {playlists.map((playlist, index) => (
            <div
              key={playlist.id}
              className="flex items-center gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="h-12 w-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{playlist.name}</p>
                <p className="text-sm text-muted-foreground">
                  Playlist • {playlist.tracks.length} songs
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;

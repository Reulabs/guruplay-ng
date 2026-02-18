import { Home, Search, Library, Plus, Heart, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { playlists } from '@/data/mockData';

const Sidebar = () => {
  const mainNav = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: User, label: 'Artist', path: '/artist' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[280px] gap-2 p-2 h-full">
      {/* Main Navigation Card */}
      <div className="bg-card rounded-lg p-3">
        <nav>
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-4 px-3 py-2 rounded-md text-sm font-semibold transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-6 w-6" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Library Card */}
      <div className="flex-1 bg-card rounded-lg flex flex-col min-h-0">
        {/* Library Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <NavLink
            to="/library"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 text-sm font-semibold transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Library className="h-6 w-6" />
            Your Library
          </NavLink>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Playlist Actions */}
        <div className="px-2 pb-2">
          <NavLink
            to="/library/liked"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 w-full p-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              )
            }
          >
            <div className="h-12 w-12 rounded bg-gradient-to-br from-indigo-700 to-slate-300 flex items-center justify-center">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-foreground">Liked Songs</p>
              <p className="text-xs text-muted-foreground">Playlist</p>
            </div>
          </NavLink>
        </div>

        {/* Playlists */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          <ul className="space-y-0.5">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <NavLink
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 p-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-foreground">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Playlist • {playlist.tracks.length} songs
                    </p>
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

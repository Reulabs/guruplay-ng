import { Home, Search, Library, Plus, Heart } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { playlists } from '@/data/mockData';

const Sidebar = () => {
  const location = useLocation();

  const mainNav = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Your Library', path: '/library' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar h-full">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gradient">Melodify</h1>
      </div>

      {/* Main Navigation */}
      <nav className="px-3">
        <ul className="space-y-1">
          {mainNav.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-foreground'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider */}
      <div className="mx-6 my-4 h-px bg-border" />

      {/* Playlist Actions */}
      <div className="px-3 space-y-1">
        <button className="flex items-center gap-4 w-full px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
          <div className="p-1 rounded bg-sidebar-foreground/20">
            <Plus className="h-4 w-4" />
          </div>
          Create Playlist
        </button>
        <NavLink
          to="/library/liked"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-4 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-foreground'
                : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50'
            )
          }
        >
          <div className="p-1 rounded gradient-primary">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          Liked Songs
        </NavLink>
      </div>

      {/* Divider */}
      <div className="mx-6 my-4 h-px bg-border" />

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        <ul className="space-y-0.5">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <NavLink
                to={`/playlist/${playlist.id}`}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-2 text-sm truncate transition-colors rounded',
                    isActive
                      ? 'text-foreground bg-sidebar-accent'
                      : 'text-sidebar-foreground hover:text-foreground'
                  )
                }
              >
                {playlist.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;

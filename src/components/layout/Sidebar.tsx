import { Home, Search, Library, Plus, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { playlists } from '@/data/mockData';

const Sidebar = () => {
  const mainNav = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Your Library', path: '/library' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar h-full">
      {/* Logo */}
      <div className="p-5">
        <h1 className="text-xl font-semibold text-foreground">Melodify</h1>
      </div>

      {/* Main Navigation */}
      <nav className="px-2">
        <ul className="space-y-0.5">
          {mainNav.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
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
      <div className="mx-4 my-3 h-px bg-border" />

      {/* Playlist Actions */}
      <div className="px-2 space-y-0.5">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
          <Plus className="h-5 w-5" />
          Create Playlist
        </button>
        <NavLink
          to="/library/liked"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-foreground'
                : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50'
            )
          }
        >
          <Heart className="h-5 w-5" />
          Liked Songs
        </NavLink>
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-border" />

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <ul className="space-y-0.5">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <NavLink
                to={`/playlist/${playlist.id}`}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 text-sm truncate transition-colors rounded-md',
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

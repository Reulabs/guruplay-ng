import { Compass, Mic2, Disc, Radio, Music, Download, ShoppingBag, Heart, RotateCcw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const displayName = user?.email ? user.email.split('@')[0] : 'Guest';

  const browseItems = [
    { icon: Compass, label: 'Discover', path: '/' },
    { icon: Mic2, label: 'Artists', path: '/artist' },
    { icon: Disc, label: 'Albums', path: '/search' },
    { icon: Radio, label: 'Stations', path: '/search' },
    { icon: Music, label: 'Music', path: '/search' },
  ];

  const yourMusicItems = [
    { icon: Download, label: 'Downloads', path: '/library' },
    { icon: ShoppingBag, label: 'Purchased', path: '/library' },
    { icon: Heart, label: 'Favourites', path: '/library' },
    { icon: RotateCcw, label: 'History', path: '/library' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[280px] gap-8 px-6 py-8 h-full bg-[#050b1b] border-r border-white/10 text-[#cfd8e5] overflow-hidden">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-[#fd4a7a] via-[#ff6f4a] to-[#ffb643] flex items-center justify-center shadow-[0_15px_60px_rgba(255,85,136,0.22)]">
            <span className="text-xl font-bold text-white">G</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#7d96b2]">Guruplay</p>
            <p className="text-sm text-white/80">Hello, {displayName}</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-[0.25em] uppercase text-white">Guruplay</h1>
      </div>

      <div className="space-y-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[#7d96b2]">Browse Music</div>
        <nav className="space-y-2">
          {browseItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 px-4 py-3 rounded-3xl text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-[#ff4d6d] bg-white/5'
                    : 'text-[#9ab1d6] hover:text-white hover:bg-white/5'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-4 flex-1 overflow-hidden">
        <div className="text-xs uppercase tracking-[0.3em] text-[#7d96b2]">Your Music</div>
        <nav className="space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {yourMusicItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 px-4 py-3 rounded-3xl text-sm transition-colors',
                  isActive
                    ? 'text-[#ff4d6d] bg-white/5'
                    : 'text-[#9ab1d6] hover:text-white hover:bg-white/5'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

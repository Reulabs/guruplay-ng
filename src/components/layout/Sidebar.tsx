import { Compass, Mic2, Disc, Radio, Music, Download, ShoppingBag, Heart, RotateCcw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Typography from '@/components/ui/typography';
import { DefaultLogo } from '@/components/misc/logo';

const Sidebar = () => {
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
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[300px] flex-col gap-8 border-r border-white/10 bg-[#050505] px-6 py-8 text-white/55 shadow-[12px_0_80px_-30px_rgba(0,0,0,0.9)]">
      <div className="space-y-4">
        <DefaultLogo markClassName="h-14 w-14" textClassName="text-lg" />
      </div>

      <div className="space-y-4">
        <Typography variant="eyebrow" weight="bold" className="text-white/35">
          Browse Music
        </Typography>
        <nav className="space-y-2">
          {browseItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <Typography variant="sm" weight="semibold" className="truncate">
                {item.label}
              </Typography>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-4 flex-1 overflow-hidden">
        <Typography variant="eyebrow" weight="bold" className="text-white/35">
          Your Music
        </Typography>
        <nav className="space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {yourMusicItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <Typography variant="sm" weight="semibold" className="truncate">
                {item.label}
              </Typography>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

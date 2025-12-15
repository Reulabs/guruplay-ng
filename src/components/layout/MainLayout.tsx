import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Player Bar */}
      <PlayerBar />
    </div>
  );
};

export default MainLayout;

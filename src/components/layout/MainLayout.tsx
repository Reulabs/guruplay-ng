import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#04050b] text-foreground overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto scrollbar-thin rounded-[32px] bg-[#090b13] m-4 shadow-2xl shadow-black/30 border border-white/10">
        <Outlet />
      </main>

      <MobileNav />
      <PlayerBar />
    </div>
  );
};

export default MainLayout;

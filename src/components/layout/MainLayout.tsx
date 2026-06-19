import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';
import TopBar from '@/components/layout/TopBar';
import PromoBanner from '@/components/layout/PromoBanner';

const MainLayout = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505]">
      <PromoBanner />
      <Sidebar />

      <main className="min-h-screen overflow-y-auto scrollbar-thin bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,#080808_0%,#000_45%)] md:ml-[300px]">
        <TopBar />
        <Outlet />
      </main>

      <MobileNav />
      <PlayerBar />
    </div>
  );
};

export default MainLayout;

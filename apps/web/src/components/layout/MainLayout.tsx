import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlayerBar from "@/components/player/PlayerBar";
import TopBar from "@/components/layout/TopBar";
import MusicSkeleton from "@guruplay/shared/fallbacks/MusicSkeleton";

export default function MainLayout() {
  return (
    <div className="min-h-dvh bg-[#0d0d0d]">
      <TopBar />
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-[calc(100dvh-80px)] min-w-0 pb-20 outline-none md:ml-64 md:pb-4"
      >
        <div className="mx-auto max-w-[1500px]">
          <Suspense
            fallback={
              <div className="p-5 pt-10 md:p-8">
                <MusicSkeleton count={10} />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
      <MobileNav />
      <PlayerBar />
    </div>
  );
}

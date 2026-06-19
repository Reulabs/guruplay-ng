import {
  Compass,
  Mic2,
  Disc,
  Radio,
  Music,
  Download,
  ShoppingBag,
  Heart,
  RotateCcw,
} from "lucide-react";
import { DefaultLogo } from "@/components/misc/logo";
import {
  SidebarNavItem,
  SidebarNavSection,
} from "@/components/layout/SidebarNav";

const Sidebar = () => {
  const browseItems = [
    {
      icon: Compass,
      label: "Discover",
      path: "/",
      activeMatch: (pathname: string) => pathname === "/",
    },
    {
      icon: Mic2,
      label: "Artists",
      path: "/artist",
      activeMatch: (pathname: string) => pathname.startsWith("/artist"),
    },
    {
      icon: Disc,
      label: "Albums",
      path: "/search?view=albums",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/search" && search === "?view=albums",
    },
    {
      icon: Radio,
      label: "Stations",
      path: "/search?view=stations",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/search" && search === "?view=stations",
    },
    {
      icon: Music,
      label: "Music",
      path: "/search?view=music",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/search" && search === "?view=music",
    },
  ];

  const yourMusicItems = [
    {
      icon: Download,
      label: "Downloads",
      path: "/library?view=downloads",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/library" && search === "?view=downloads",
    },
    {
      icon: ShoppingBag,
      label: "Purchased",
      path: "/library?view=purchased",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/library" && search === "?view=purchased",
    },
    {
      icon: Heart,
      label: "Favourites",
      path: "/library?view=favourites",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/library" && search === "?view=favourites",
    },
    {
      icon: RotateCcw,
      label: "History",
      path: "/library?view=history",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/library" && search === "?view=history",
    },
  ];

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[300px] flex-col gap-8 border-r border-white/10 bg-[#050505] px-6 py-8 text-white/55 shadow-[12px_0_80px_-30px_rgba(0,0,0,0.9)]">
      <div className="space-y-4">
        <DefaultLogo markClassName="h-14 w-14" textClassName="text-lg" />
      </div>

      <SidebarNavSection title="Browse Music">
        {browseItems.map((item) => (
          <SidebarNavItem key={item.label} {...item} />
        ))}
      </SidebarNavSection>

      <div className="space-y-4 flex-1 overflow-hidden">
        <SidebarNavSection title="Your Music">
          <div className="space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {yourMusicItems.map((item) => (
              <SidebarNavItem key={item.label} {...item} />
            ))}
          </div>
        </SidebarNavSection>
      </div>
    </aside>
  );
};

export default Sidebar;

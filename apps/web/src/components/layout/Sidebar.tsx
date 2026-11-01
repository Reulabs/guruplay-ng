import {
  Compass,
  Mic2,
  Radio,
  Music,
  ListMusic,
  Heart,
  RotateCcw,
} from "lucide-react";
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
      icon: Radio,
      label: "Stations",
      path: "/stations",
      activeMatch: (pathname: string) => pathname === "/stations",
    },
    {
      icon: Music,
      label: "Music",
      path: "/search?view=music",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/search",
    },
  ];

  const yourMusicItems = [
    {
      icon: ListMusic,
      label: "Playlists",
      path: "/library?view=playlists",
      activeMatch: (pathname: string, search: string) =>
        pathname.startsWith("/playlist/") ||
        (pathname === "/library" && search === "?view=playlists"),
    },
    {
      icon: Heart,
      label: "Favourites",
      path: "/library?view=favourites",
      activeMatch: (pathname: string, search: string) =>
        pathname === "/library" && (!search || search === "?view=favourites"),
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
    <aside className="hidden md:flex fixed bottom-0 top-20 left-0 z-40 w-64 flex-col gap-8 overflow-y-auto border-r border-white/[0.06] bg-[#0d0d0d] px-4 pb-32 pt-8 text-white/55">
      <SidebarNavSection title="Browse">
        {browseItems.map((item) => (
          <SidebarNavItem key={item.label} {...item} />
        ))}
      </SidebarNavSection>

      <div className="space-y-4 flex-1 overflow-hidden">
        <SidebarNavSection title="Your music">
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

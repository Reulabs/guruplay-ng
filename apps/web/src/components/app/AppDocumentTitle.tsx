import { useLocation } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/use-document-title";

const routeTitles: Record<string, string> = {
  "/": "Home",
  "/search": "Search",
  "/upload": "Upload music",
  "/artist": "Artists",
  "/library": "Library",
  "/settings": "Settings",
  "/support": "Support",
  "/stations": "Stations",
  "/subscription": "Subscription",
  "/dashboard": "Dashboard",
};

const AppDocumentTitle = () => {
  const { pathname } = useLocation();
  const title = pathname.startsWith("/playlist/")
    ? "Playlist"
    : pathname.startsWith("/artist/")
      ? "Artist"
      : routeTitles[pathname];

  useDocumentTitle(title);
  return null;
};

export default AppDocumentTitle;

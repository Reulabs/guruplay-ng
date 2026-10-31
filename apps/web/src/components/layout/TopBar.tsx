import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Upload } from "lucide-react";
import { Logo } from "@guruplay/shared/logo";
import { Button } from "@guruplay/ui/button";
import { useAuth } from "@/context/AuthContext";
import NotificationsPopover from "@/components/layout/NotificationsPopover";
import UserAccountMenu from "@/components/layout/UserAccountMenu";

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAuthLoading, openAuthDialog } = useAuth();
  const [search, setSearch] = useState(
    () => new URLSearchParams(location.search).get("q") || "",
  );
  useEffect(() => {
    setSearch(
      location.pathname === "/search"
        ? new URLSearchParams(location.search).get("q") || ""
        : "",
    );
  }, [location.pathname, location.search]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate(
      search.trim()
        ? `/search?q=${encodeURIComponent(search.trim())}`
        : "/search",
    );
  };
  return (
    <header className="sticky top-0 z-50 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-white/[0.07] bg-[#0d0d0d]/95 px-4 py-4 backdrop-blur-xl md:h-20 md:grid-cols-[224px_minmax(0,1fr)_auto] md:px-6 md:py-0 lg:gap-x-8">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Link
        to="/"
        aria-label="Guruplay home"
        className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Logo
          showWordmark
          markClassName="h-9 w-9"
          textClassName="text-lg tracking-tight"
          className="gap-2.5"
        />
      </Link>
      <form
        onSubmit={submit}
        role="search"
        className="col-span-2 row-start-2 flex h-11 w-full items-center gap-3 rounded-full border border-transparent bg-[#202020] px-4 transition-colors focus-within:border-white/25 md:col-span-1 md:col-start-2 md:row-start-1 md:mx-auto md:max-w-[540px]"
      >
        <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search music and artists"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search for artists and songs"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
        />
      </form>
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 md:col-start-3 lg:gap-3">
        {isAuthLoading ? (
          <div
            className="h-10 w-10 rounded-full bg-white/5 motion-safe:animate-pulse"
            aria-label="Loading account"
          />
        ) : isAuthenticated ? (
          <>
            <span className="hidden sm:block">
              <NotificationsPopover />
            </span>
            <UserAccountMenu />
          </>
        ) : (
          <Button
            variant="ghost"
            onClick={() => openAuthDialog("login")}
            className="rounded-full px-2 text-sm sm:px-4"
          >
            Log in
          </Button>
        )}
        <Button
          asChild
          variant="secondary"
          className="h-11 rounded-full border border-white/[0.06] bg-white/[0.07] px-3 text-xs font-bold tracking-wide hover:bg-white/[0.12] sm:px-5 sm:text-sm"
        >
          <Link to="/upload">
            <Upload className="h-4 w-4 text-primary" />
            <span className="ml-1">Upload</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}

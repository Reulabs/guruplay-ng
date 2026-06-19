import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import NotificationsPopover from '@/components/layout/NotificationsPopover';
import UserAccountMenu from '@/components/layout/UserAccountMenu';

const TopBar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthDialog } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center gap-3 bg-black/55 px-4 backdrop-blur-xl md:px-8">
      <div className="hidden items-center gap-2 md:flex">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full border border-white/10 bg-white/[0.06] text-white hover:bg-white/12"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate(1)}
          className="rounded-full border border-white/10 bg-white/[0.06] text-white hover:bg-white/12"
          aria-label="Go forward"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <button
        onClick={() => navigate('/search')}
        className="ml-auto flex h-12 min-w-0 max-w-md flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-5 text-left text-muted-foreground shadow-inner transition-colors hover:border-white/20 hover:bg-white/[0.1] md:ml-auto"
      >
        <Search className="h-5 w-5" />
        <span>Search</span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {isAuthenticated ? (
          <>
            <NotificationsPopover />
            <UserAccountMenu />
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => openAuthDialog('signup')}
              className={cn('rounded-full px-3 font-bold text-white/80 hover:bg-white/10 hover:text-white sm:px-5')}
            >
              Sign up
            </Button>
            <Button
              variant="secondary"
              onClick={() => openAuthDialog('login')}
              className="rounded-full bg-white px-3 font-bold text-black hover:bg-white/90 sm:px-5"
            >
              Log in
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;

import { useState } from 'react';
import { ExternalLink, LogOut, Settings, UserRound, Clock3, LifeBuoy, Shield, CircleDollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import Typography from '@/components/ui/typography';
import { useToast } from '@/hooks/use-toast';

const getInitial = (value?: string) => {
  return (value || 'G').trim().charAt(0).toUpperCase();
};

const UserAccountMenu = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const name = user?.displayName || user?.email || 'Account';

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      setIsLogoutOpen(false);
      navigate('/');
      toast({
        title: 'Logged out',
        description: 'Your session has ended.',
      });
    } catch (error) {
      toast({
        title: 'Could not log out',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-4 text-white transition-colors hover:bg-white/12">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#4c9aff] text-base font-black text-black">
              {getInitial(name)}
            </span>
            <span className="hidden max-w-40 truncate text-sm font-bold sm:block">{name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-2xl border-white/10 bg-[#242424] p-2 text-white shadow-2xl">
          <DropdownMenuLabel className="px-3 py-3">
            <Typography variant="body" weight="bold" truncate>{name}</Typography>
            <Typography variant="caption" className="text-white/50" truncate>{user?.email}</Typography>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <UserRound className="h-5 w-5" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <CircleDollarSign className="h-5 w-5" />
            Artist dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/library')} className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <Clock3 className="h-5 w-5" />
            Recents
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <LifeBuoy className="h-5 w-5" />
            Support
            <ExternalLink className="ml-auto h-4 w-4 text-white/40" />
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <Shield className="h-5 w-5" />
            Private session
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white">
            <Settings className="h-5 w-5" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsLogoutOpen(true);
            }}
            className="gap-3 rounded-xl px-3 py-3 text-base focus:bg-white/10 focus:text-white"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent className="border-white/10 bg-[#111] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Guruplay?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to log in again before listening, uploading, or viewing account activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserAccountMenu;

import { Music2 } from 'lucide-react';
import { AuthMode, useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AuthForm from '@/components/auth/AuthForm';
import Typography from '@/components/ui/typography';

const copy: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: 'Log in to Guruplay',
    description: 'Continue listening, save music, and manage your artist dashboard.',
  },
  signup: {
    title: 'Sign up for Guruplay',
    description: 'Create an account to listen, upload, and get featured.',
  },
};

const AuthDialog = () => {
  const { authDialogMode, isAuthDialogOpen, closeAuthDialog, openAuthDialog } = useAuth();
  const activeCopy = copy[authDialogMode];

  return (
    <Dialog open={isAuthDialogOpen} onOpenChange={(open) => (open ? openAuthDialog(authDialogMode) : closeAuthDialog())}>
      <DialogContent className="max-w-md border-white/10 bg-[#080808] p-6 text-white shadow-2xl sm:rounded-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary">
            <Music2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle asChild>
            <Typography as="h2" variant="h2" weight="bold" align="center">
              {activeCopy.title}
            </Typography>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{activeCopy.description}</DialogDescription>
        </DialogHeader>
        <AuthForm mode={authDialogMode} onModeChange={openAuthDialog} />
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

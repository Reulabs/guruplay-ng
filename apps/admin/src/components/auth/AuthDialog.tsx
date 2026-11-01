import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@guruplay/ui/dialog";
import AuthForm from "@/components/auth/AuthForm";
import Typography from "@guruplay/ui/typography";
import { DefaultLogo } from "@guruplay/shared/logo";

const AuthDialog = () => {
  const { isAuthDialogOpen, closeAuthDialog, openAuthDialog } = useAuth();

  return (
    <Dialog
      open={isAuthDialogOpen}
      onOpenChange={(open) =>
        open ? openAuthDialog("login") : closeAuthDialog()
      }
    >
      <DialogContent className="max-w-md border-white/10 bg-[#080808] p-6 text-white shadow-2xl sm:rounded-2xl">
        <DialogHeader className="items-center text-center">
          <DefaultLogo />
          <DialogTitle asChild>
            <Typography as="h2" variant="h2" weight="bold" align="center">
              Log in to Guruplay Admin
            </Typography>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review artists and manage music with your administrator account.
          </DialogDescription>
        </DialogHeader>
        <AuthForm />
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

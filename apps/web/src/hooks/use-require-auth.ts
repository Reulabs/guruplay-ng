import { useCallback } from "react";
import { AuthMode, useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RequireAuthOptions {
  mode?: AuthMode;
  title?: string;
  description?: string;
}

export const useRequireAuth = () => {
  const { isAuthenticated, openAuthDialog } = useAuth();
  const { toast } = useToast();

  return useCallback(
    ({
      mode = "login",
      title = "Log in to continue",
      description = "Create an account or log in to use this feature.",
    }: RequireAuthOptions = {}) => {
      if (isAuthenticated) {
        return true;
      }

      toast({ title, description });
      openAuthDialog(mode);
      return false;
    },
    [isAuthenticated, openAuthDialog, toast],
  );
};

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
export default function PersonalGate({ children }: { children: ReactNode }) {
  const { user, isAuthLoading, openAuthDialog } = useAuth();
  if (isAuthLoading) return <LoadingState />;
  if (!user)
    return (
      <EmptyState
        title="Make it your own"
        description="Sign in to save music, create private playlists and manage your account."
        actionLabel="Sign in"
        onAction={() => openAuthDialog("login")}
      />
    );
  return <>{children}</>;
}

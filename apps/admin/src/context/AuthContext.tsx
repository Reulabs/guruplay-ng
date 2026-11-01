import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AppError, AppErrorCode, getAppError } from "@guruplay/common/errors";
import { UserType } from "@/lib/artist";

export type AuthMode = "login" | "signup";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  userType?: UserType;
}

export interface SignUpProfile {
  email: string;
  password: string;
  displayName: string;
  dateOfBirth: string;
  gender: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authDialogMode: AuthMode;
  isAuthDialogOpen: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profile: SignUpProfile) => Promise<void>;
  logout: () => Promise<void>;
  openAuthDialog: (mode?: AuthMode) => void;
  closeAuthDialog: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthUser = (user: User, userType?: UserType): AuthUser => {
  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email || "",
    displayName: metadata.display_name || metadata.displayName,
    dateOfBirth: metadata.date_of_birth || metadata.dateOfBirth,
    gender: metadata.gender,
    userType,
  };
};

const ensureUserRecord = async (user: User) => {
  const metadata = user.user_metadata || {};

  const { error } = await supabase.from("users").upsert({
    id: user.id,
    email: user.email || "",
    display_name:
      metadata.display_name ||
      metadata.displayName ||
      user.email ||
      "Guruplay user",
    last_login: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw getAppError(error);
  const { error: loginError } = await supabase.from("users").update({ last_login: user.last_sign_in_at || new Date().toISOString() }).eq("id", user.id);
  if (loginError) throw getAppError(loginError);
};

const loadAuthUser = async (user: User): Promise<AuthUser> => {
  await ensureUserRecord(user);

  const { data, error } = await supabase
    .from("users")
    .select("user_type,display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw getAppError(error);
  return { ...getAuthUser(user, data?.user_type as UserType | undefined), displayName: data?.display_name };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authDialogMode, setAuthDialogMode] = useState<AuthMode>("login");
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let alive = true;
    let generation = 0;
    const hydrate = async (authUser?: User) => {
      const attempt = ++generation;
      try {
        const profile = authUser ? await loadAuthUser(authUser) : null;
        if (alive && generation === attempt) setUser(profile);
      } catch {
        if (alive && generation === attempt) setUser(null);
      } finally {
        if (alive && generation === attempt) setIsAuthLoading(false);
      }
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (alive) void hydrate(session?.user); }, 0);
    });
    return () => { alive = false; generation += 1; data.subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new AppError(AppErrorCode.SupabaseNotConfigured);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw getAppError(error);
    if (data.user) {
      setUser(await loadAuthUser(data.user));
    }
    setIsAuthDialogOpen(false);
  }, []);

  const signup = useCallback(async (profile: SignUpProfile) => {
    if (!isSupabaseConfigured) {
      throw new AppError(AppErrorCode.SupabaseNotConfigured);
    }

    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password: profile.password,
      options: {
        data: {
          display_name: profile.displayName,
          date_of_birth: profile.dateOfBirth,
          gender: profile.gender,
        },
      },
    });

    if (error) throw getAppError(error);
    if (data.session?.user) {
      setUser(await loadAuthUser(data.session.user));
    } else {
      throw new AppError(AppErrorCode.EmailConfirmationRequired);
    }
    setIsAuthDialogOpen(false);
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) throw getAppError(error);
    }

    setUser(null);
  }, []);

  const openAuthDialog = useCallback((mode: AuthMode = "login") => {
    setAuthDialogMode(mode);
    setIsAuthDialogOpen(true);
  }, []);

  const closeAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      authDialogMode,
      isAuthDialogOpen,
      login,
      signup,
      logout,
      openAuthDialog,
      closeAuthDialog,
    }),
    [
      authDialogMode,
      closeAuthDialog,
      isAuthDialogOpen,
      isAuthLoading,
      login,
      logout,
      openAuthDialog,
      signup,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

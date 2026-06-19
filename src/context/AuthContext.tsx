import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AuthMode = 'login' | 'signup';

interface AuthUser {
  email: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authDialogMode: AuthMode;
  isAuthDialogOpen: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  openAuthDialog: (mode?: AuthMode) => void;
  closeAuthDialog: () => void;
}

const AUTH_STORAGE_KEY = 'guru-music-auth-user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): AuthUser | null => {
  try {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authDialogMode, setAuthDialogMode] = useState<AuthMode>('login');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  const login = useCallback((nextUser: AuthUser) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setIsAuthDialogOpen(false);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const openAuthDialog = useCallback((mode: AuthMode = 'login') => {
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
      authDialogMode,
      isAuthDialogOpen,
      login,
      logout,
      openAuthDialog,
      closeAuthDialog,
    }),
    [authDialogMode, closeAuthDialog, isAuthDialogOpen, login, logout, openAuthDialog, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

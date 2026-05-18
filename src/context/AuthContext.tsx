'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { validateCredentials, AuthUser } from '@/utils/mockAuth';

const STORAGE_KEY = 'dooh_mock_user';

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthInitialized: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCurrentUser(readStoredUser());
      setIsAuthInitialized(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function login(email: string, password: string): boolean {
    const user = validateCredentials(email, password);
    if (!user) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return true;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, isAuthInitialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

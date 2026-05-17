'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getProtectedRouteRedirect } from '@/utils/authRedirect';
import type { Role } from '@/utils/mockAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { currentUser, isAuthInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const redirectTo = getProtectedRouteRedirect({ currentUser, isAuthInitialized, requiredRole });
    if (redirectTo) router.replace(redirectTo);
  }, [currentUser, isAuthInitialized, requiredRole, router]);

  if (!isAuthInitialized || currentUser === null) return null;
  if (requiredRole && currentUser.role !== requiredRole) return null;

  return <>{children}</>;
}

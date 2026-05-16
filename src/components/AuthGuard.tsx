'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/utils/mockAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/login');
      return;
    }
    if (requiredRole && currentUser.role !== requiredRole) {
      router.replace('/');
    }
  }, [currentUser, requiredRole, router]);

  if (currentUser === null) return null;
  if (requiredRole && currentUser.role !== requiredRole) return null;

  return <>{children}</>;
}

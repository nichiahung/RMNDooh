import type { AuthUser, Role } from '@/utils/mockAuth';

interface ProtectedRouteRedirectInput {
  currentUser: AuthUser | null;
  isAuthInitialized: boolean;
  requiredRole?: Role;
}

export function getProtectedRouteRedirect({
  currentUser,
  isAuthInitialized,
  requiredRole,
}: ProtectedRouteRedirectInput): string | null {
  if (!isAuthInitialized) return null;
  if (currentUser === null) return '/login';
  if (requiredRole && currentUser.role !== requiredRole) return '/';
  return null;
}

interface LoginRedirectInput {
  currentUser: AuthUser | null;
  isAuthInitialized: boolean;
}

export function getLoginRedirect({
  currentUser,
  isAuthInitialized,
}: LoginRedirectInput): string | null {
  if (!isAuthInitialized || currentUser === null) return null;
  return currentUser.role === 'admin' ? '/admin' : '/';
}

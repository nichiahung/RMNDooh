import { describe, expect, it } from 'vitest';
import { getLoginRedirect, getProtectedRouteRedirect } from '@/utils/authRedirect';

describe('getProtectedRouteRedirect', () => {
  it('waits for auth initialization before redirecting', () => {
    expect(getProtectedRouteRedirect({
      currentUser: null,
      isAuthInitialized: false,
    })).toBeNull();
  });

  it('redirects unauthenticated users after initialization', () => {
    expect(getProtectedRouteRedirect({
      currentUser: null,
      isAuthInitialized: true,
    })).toBe('/login');
  });

  it('redirects users without the required role', () => {
    expect(getProtectedRouteRedirect({
      currentUser: { email: 'advertiser@demo.com', role: 'advertiser' },
      isAuthInitialized: true,
      requiredRole: 'admin',
    })).toBe('/');
  });
});

describe('getLoginRedirect', () => {
  it('waits for auth initialization before redirecting from login', () => {
    expect(getLoginRedirect({
      currentUser: null,
      isAuthInitialized: false,
    })).toBeNull();
  });

  it('redirects authenticated users to their role home', () => {
    expect(getLoginRedirect({
      currentUser: { email: 'admin@demo.com', role: 'admin' },
      isAuthInitialized: true,
    })).toBe('/admin');
  });
});

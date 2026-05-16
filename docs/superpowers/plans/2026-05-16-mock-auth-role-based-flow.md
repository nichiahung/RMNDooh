# Mock Auth & Role-Based Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock login gate that determines which flows (self-service / proposals / admin) a user sees based on their account role.

**Architecture:** A pure `validateCredentials()` utility holds the hardcoded account table; `AuthContext` wraps the app with login/logout state persisted to `localStorage`; a client-side `AuthGuard` component redirects unauthenticated visitors to `/login`. The homepage `/` is WorkspacePage (no `/workspace` route needed).

**Tech Stack:** React Context, localStorage, Next.js App Router (static export — no middleware), Vitest (node environment), TailwindCSS.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/mockAuth.ts` | Create | Pure credential validator — testable in node env |
| `src/__tests__/mockAuth.test.ts` | Create | Unit tests for validateCredentials |
| `src/context/AuthContext.tsx` | Create | AuthProvider + useAuth hook + localStorage sync |
| `src/app/login/page.tsx` | Create | Login form page |
| `src/components/AuthGuard.tsx` | Create | Client-side route protection |
| `src/app/layout.tsx` | Modify | Wrap with AuthProvider |
| `src/app/page.tsx` | Modify | Wrap with AuthGuard |
| `src/app/campaign-planner/page.tsx` | Modify | Wrap with AuthGuard |
| `src/app/assets/page.tsx` | Modify | Wrap with AuthGuard |
| `src/app/proposal-builder/page.tsx` | Modify | Wrap with AuthGuard |
| `src/app/proposal-review/page.tsx` | Modify | Wrap with AuthGuard |
| `src/app/admin/page.tsx` | Modify | Wrap with AuthGuard (admin-only) |
| `src/components/workspace/WorkspacePage.tsx` | Modify | Read role from useAuth, remove dropdown |
| `src/components/AppNav.tsx` | Modify | Show email + logout button, remove quick-action buttons |

---

### Task 1: Pure credential validator utility

**Files:**
- Create: `src/utils/mockAuth.ts`
- Create: `src/__tests__/mockAuth.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/mockAuth.test.ts
import { validateCredentials } from '@/utils/mockAuth';

describe('validateCredentials', () => {
  it('returns advertiser user for valid advertiser credentials', () => {
    const result = validateCredentials('advertiser@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'advertiser@demo.com', role: 'advertiser' });
  });

  it('returns sales user for valid sales credentials', () => {
    const result = validateCredentials('sales@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'sales@demo.com', role: 'sales' });
  });

  it('returns admin user for valid admin credentials', () => {
    const result = validateCredentials('admin@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'admin@demo.com', role: 'admin' });
  });

  it('returns null for wrong password', () => {
    expect(validateCredentials('advertiser@demo.com', 'wrong')).toBeNull();
  });

  it('returns null for unknown email', () => {
    expect(validateCredentials('unknown@demo.com', 'demo1234')).toBeNull();
  });

  it('returns null for empty credentials', () => {
    expect(validateCredentials('', '')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/mockAuth.test.ts
```

Expected: FAIL — `Cannot find module '@/utils/mockAuth'`

- [ ] **Step 3: Implement the utility**

```ts
// src/utils/mockAuth.ts
export type Role = 'advertiser' | 'sales' | 'admin';

export interface AuthUser {
  email: string;
  role: Role;
}

const MOCK_ACCOUNTS: Array<AuthUser & { password: string }> = [
  { email: 'advertiser@demo.com', password: 'demo1234', role: 'advertiser' },
  { email: 'sales@demo.com',      password: 'demo1234', role: 'sales' },
  { email: 'admin@demo.com',      password: 'demo1234', role: 'admin' },
];

export function validateCredentials(email: string, password: string): AuthUser | null {
  const account = MOCK_ACCOUNTS.find(
    a => a.email === email && a.password === password,
  );
  if (!account) return null;
  return { email: account.email, role: account.role };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/mockAuth.test.ts
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/mockAuth.ts src/__tests__/mockAuth.test.ts
git commit -m "feat: add mock auth credential validator"
```

---

### Task 2: AuthContext with localStorage persistence

**Files:**
- Create: `src/context/AuthContext.tsx`

- [ ] **Step 1: Create AuthContext**

```tsx
// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { validateCredentials, AuthUser } from '@/utils/mockAuth';

const STORAGE_KEY = 'dooh_mock_user';

interface AuthContextValue {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
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
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to AuthContext

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: add AuthContext with localStorage persistence"
```

---

### Task 3: AuthGuard client component

**Files:**
- Create: `src/components/AuthGuard.tsx`

- [ ] **Step 1: Create AuthGuard**

```tsx
// src/components/AuthGuard.tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthGuard.tsx
git commit -m "feat: add AuthGuard client component for route protection"
```

---

### Task 4: Login page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { currentUser, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) router.replace('/');
  }, [currentUser, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      router.push('/');
    } else {
      setError('帳號或密碼錯誤');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">DOOH Platform</h1>
        <p className="text-sm text-slate-500 mb-8">請登入以繼續</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="advertiser@demo.com"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            登入
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-medium mb-1">Demo 帳號</p>
          <p className="text-xs text-slate-500">advertiser@demo.com / demo1234</p>
          <p className="text-xs text-slate-500">sales@demo.com / demo1234</p>
          <p className="text-xs text-slate-500">admin@demo.com / demo1234</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add mock login page with demo account hints"
```

---

### Task 5: Wire AuthProvider into layout + AuthGuard into all protected pages

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/campaign-planner/page.tsx`
- Modify: `src/app/assets/page.tsx`
- Modify: `src/app/proposal-builder/page.tsx`
- Modify: `src/app/proposal-review/page.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add AuthProvider to root layout**

Replace the contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from '@/i18n/I18nProvider';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RMN DOOH Marketplace",
    template: "%s | RMN DOOH",
  },
  description: "Plan, review, and manage retail media DOOH campaigns.",
  applicationName: "RMN DOOH",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Protect homepage (`/`)**

Replace `src/app/page.tsx`:

```tsx
'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';

export default function HomePage() {
  return (
    <AuthGuard>
      <WorkspacePage />
    </AuthGuard>
  );
}
```

- [ ] **Step 3: Protect `/campaign-planner`**

Replace `src/app/campaign-planner/page.tsx`:

```tsx
'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { CampaignPlannerPage } from '@/components/campaign-planner/CampaignPlannerPage';

export default function Page() {
  return (
    <AuthGuard>
      <CampaignPlannerPage />
    </AuthGuard>
  );
}
```

- [ ] **Step 4: Protect `/assets`**

Replace `src/app/assets/page.tsx`:

```tsx
'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AssetsPage } from '@/components/AssetsPage';

export default function AssetsRoute() {
  return (
    <AuthGuard>
      <AssetsPage />
    </AuthGuard>
  );
}
```

- [ ] **Step 5: Protect `/proposal-builder`**

Replace `src/app/proposal-builder/page.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';

const ProposalBuilderPage = dynamic(
  () => import('@/components/proposal/ProposalBuilderPage').then(mod => mod.ProposalBuilderPage),
  { ssr: false },
);

export default function ProposalBuilderRoute() {
  return (
    <AuthGuard>
      <ProposalBuilderPage />
    </AuthGuard>
  );
}
```

- [ ] **Step 6: Protect `/proposal-review`**

Replace `src/app/proposal-review/page.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';

const ProposalReviewPage = dynamic(
  () => import('@/components/proposal/ProposalReviewPage').then(mod => mod.ProposalReviewPage),
  { ssr: false },
);

export default function ProposalReviewRoute() {
  return (
    <AuthGuard>
      <ProposalReviewPage />
    </AuthGuard>
  );
}
```

- [ ] **Step 7: Protect `/admin` (admin-only)**

Replace `src/app/admin/page.tsx`:

```tsx
'use client';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminDashboardPage } from '@/components/admin/AdminDashboardPage';

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboardPage />
    </AuthGuard>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/campaign-planner/page.tsx src/app/assets/page.tsx src/app/proposal-builder/page.tsx src/app/proposal-review/page.tsx src/app/admin/page.tsx
git commit -m "feat: protect all routes with AuthGuard, wire AuthProvider into layout"
```

---

### Task 6: Update WorkspacePage to use AuthContext

**Files:**
- Modify: `src/components/workspace/WorkspacePage.tsx`

- [ ] **Step 1: Replace role dropdown with useAuth**

In `src/components/workspace/WorkspacePage.tsx`, make these changes:

1. Add import: `import { useAuth } from '@/context/AuthContext';`
2. Remove: `const [role, setRole] = useState<Role>('advertiser');`
3. Add: `const { currentUser } = useAuth();` and `const role = currentUser?.role ?? 'advertiser';`
4. Remove the `type Role = 'advertiser' | 'sales' | 'admin';` local type definition (now imported from `@/utils/mockAuth` if needed, but `role` is just used as a string for comparison — no import needed)
5. In the header, remove the `<div className="flex items-center gap-2">` block containing the role select dropdown and its label
6. Keep the `{role === 'admin' && <Link href="/admin">...</Link>}` conditional — it still works because `role` is now derived from `currentUser.role`

The final `WorkspacePage` header should look like:

```tsx
<header className="bg-white border-b border-slate-200 sticky top-0 z-10">
  <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <h1 className="text-xl font-bold text-slate-800">DOOH Workspace</h1>
    <div className="flex items-center gap-4">
      {role === 'admin' && (
        <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
          進入管理後台
        </Link>
      )}
    </div>
  </div>
</header>
```

And at the top of `WorkspacePage` function body:

```tsx
const { currentUser } = useAuth();
const role = currentUser?.role ?? 'advertiser';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/WorkspacePage.tsx
git commit -m "feat: WorkspacePage reads role from AuthContext, removes simulation dropdown"
```

---

### Task 7: Update AppNav with user info + logout

**Files:**
- Modify: `src/components/AppNav.tsx`

- [ ] **Step 1: Replace quick-action buttons with user info and logout**

Replace the entire contents of `src/components/AppNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ImageIcon, Eye, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-30">
      <div className="flex items-center gap-8">
        <span className="text-base font-bold text-slate-900 tracking-tight">DOOH Platform</span>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> 我的活動
          </Link>
          <Link
            href="/assets"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/assets' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 素材庫
          </Link>
          <Link
            href="/proposal-review"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/proposal-review' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4" /> 提案審核
          </Link>
        </nav>
      </div>
      {currentUser && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{currentUser.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles and run all tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: no TS errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat: AppNav shows current user email and logout button"
```

---

### Task 8: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test login gate**

1. Open `http://localhost:3000` in browser
2. Verify redirect to `/login`
3. Enter wrong credentials → expect "帳號或密碼錯誤" error
4. Enter `advertiser@demo.com` / `demo1234` → expect redirect to `/`
5. Verify WorkspacePage shows only "自助購買" section (no dropdown)
6. Verify AppNav shows `advertiser@demo.com` + 登出 button

- [ ] **Step 3: Test sales role**

1. Click 登出 → redirected to `/login`
2. Enter `sales@demo.com` / `demo1234`
3. Verify WorkspacePage shows only "專案提案" section

- [ ] **Step 4: Test admin role**

1. Logout, login as `admin@demo.com` / `demo1234`
2. Verify WorkspacePage shows both sections + "進入管理後台" link
3. Click "進入管理後台" → verify `/admin` loads
4. Logout, try visiting `/admin` directly → verify redirect to `/login`

- [ ] **Step 5: Test localStorage persistence**

1. Login as any account
2. Refresh the page
3. Verify still logged in (not redirected to `/login`)

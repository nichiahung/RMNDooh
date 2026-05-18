# Mobile Navigation Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hamburger-triggered left drawer to the app shell so the navigation is usable on mobile without consuming horizontal space.

**Architecture:** Two files change. `AppShell.tsx` gains `isMobileNavOpen` state, a mobile-only top header bar (h-14, `bg-slate-700`) with a hamburger button, and a backdrop overlay. `AppSidebar.tsx` accepts `mobileOpen` / `onMobileClose` props and renders as a `fixed` overlay drawer on mobile while preserving all existing desktop collapse behaviour unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS (responsive prefixes + transition utilities), lucide-react (`Menu` icon already available), Next.js App Router.

---

### Task 1: Update AppSidebar to support mobile drawer mode

**Files:**
- Modify: `src/components/shell/AppSidebar.tsx`

AppSidebar currently takes no props. This task adds two optional props and restructures the `<aside>` className so that on mobile it renders as a fixed slide-in drawer while on desktop (≥ md) everything works exactly as before.

**Read the file first** to understand the current structure before editing:
`src/components/shell/AppSidebar.tsx` (206 lines)

Key facts about the current file:
- `<aside>` uses `relative`, `transition-[width]`, `w-[220px]` or `w-[60px]`, `flex flex-col h-full flex-shrink-0 overflow-visible bg-slate-700 border-r border-slate-600`
- Collapse toggle `<button onClick={toggle}>` is at lines 99–114; must be hidden on mobile
- `{!collapsed && (...)}` gates all text labels throughout the component
- `<Link href={item.href}>` at line 133 — needs `onClick` to close drawer on mobile

- [ ] **Step 1: Add props to the function signature**

Change line 15:
```tsx
export function AppSidebar() {
```
To:
```tsx
interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps = {}) {
```

- [ ] **Step 2: Add `showExpanded` derived variable**

After line 19 (`const { collapsed, toggle } = useSidebarCollapse();`), add:

```tsx
// On mobile drawer mode (mobileOpen is defined), always show expanded layout.
// On desktop, respect the collapsed state.
const isMobileDrawer = mobileOpen !== undefined;
const showExpanded = isMobileDrawer || !collapsed;
```

- [ ] **Step 3: Replace the `<aside>` opening tag className**

Replace lines 78–82:
```tsx
<aside
  className={`relative bg-slate-700 border-r border-slate-600 flex flex-col h-full flex-shrink-0 overflow-visible transition-[width] duration-200 ease-in-out ${
    collapsed ? 'w-[60px]' : 'w-[220px]'
  }`}
>
```
With:
```tsx
<aside
  className={[
    // Shared visual styles
    'flex flex-col bg-slate-700 border-r border-slate-600 overflow-visible',
    // Mobile: fixed overlay drawer
    'fixed inset-y-0 left-0 z-50 w-[220px]',
    'transition-transform duration-300 ease-out',
    mobileOpen ? 'translate-x-0' : '-translate-x-full',
    // Desktop overrides (md+): restore in-flow sidebar behaviour
    'md:static md:inset-auto md:z-auto',
    'md:h-full md:flex-shrink-0',
    'md:translate-x-0',
    'md:transition-[width] md:duration-200 md:ease-in-out',
    collapsed ? 'md:w-[60px]' : 'md:w-[220px]',
  ].join(' ')}
>
```

- [ ] **Step 4: Hide the collapse toggle button on mobile**

The collapse toggle button starts at line 99. Wrap it so it is hidden on mobile:

Find:
```tsx
        <button
          onClick={toggle}
          className={`group flex h-7 w-7 flex-shrink-0 items-center justify-center text-slate-300 hover:text-white transition-colors ${
            collapsed
              ? 'absolute -right-3 top-3.5 z-50 rounded-full border border-slate-500 bg-slate-600 shadow-md hover:bg-slate-500'
              : 'relative rounded-lg hover:bg-white/10'
          }`}
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
          <span className="absolute left-[34px] z-50 hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
            {collapsed ? '展開側欄' : '收合側欄'}
          </span>
        </button>
```

Replace with:
```tsx
        <button
          onClick={toggle}
          className={`group hidden md:flex h-7 w-7 flex-shrink-0 items-center justify-center text-slate-300 hover:text-white transition-colors ${
            collapsed
              ? 'absolute -right-3 top-3.5 z-50 rounded-full border border-slate-500 bg-slate-600 shadow-md hover:bg-slate-500'
              : 'relative rounded-lg hover:bg-white/10'
          }`}
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
          <span className="absolute left-[34px] z-50 hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
            {collapsed ? '展開側欄' : '收合側欄'}
          </span>
        </button>
```

(Only change: add `hidden md:flex` to the className — removing `flex` and adding `hidden md:flex`.)

- [ ] **Step 5: Replace all `!collapsed` with `showExpanded` for label/text rendering**

There are multiple `{!collapsed && (...)}` guards in the file. Replace every occurrence of `!collapsed` used for showing text/labels with `showExpanded`. The collapsed dot-badge and tooltip guards (`{collapsed && (...)}`) should become `{!showExpanded && (...)}`.

Specifically, replace:
- Line 121: `{!collapsed && (` → `{showExpanded && (`
- Line 145: `{!collapsed && (` → `{showExpanded && (`
- Line 148: `{!collapsed && badgeCount > 0 && (` → `{showExpanded && badgeCount > 0 && (`
- Line 142: `{collapsed && badgeCount > 0 && (` → `{!showExpanded && badgeCount > 0 && (`
- Line 153: `{collapsed && (` (tooltip in nav) → `{!showExpanded && (`
- Line 176: `{!collapsed && (` (user info labels) → `{showExpanded && (`
- Line 182: `{collapsed && (` (user info tooltip) → `{!showExpanded && (`
- Line 195: `{!collapsed && <span>登出</span>}` → `{showExpanded && <span>登出</span>}`
- Line 196: `{collapsed && (` (logout tooltip) → `{!showExpanded && (`

- [ ] **Step 6: Add `onMobileClose` to each nav Link**

Find the nav `<Link>` element (around line 133):
```tsx
                    <Link
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
```
Replace with:
```tsx
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={`group relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
```

- [ ] **Step 7: Verify build**

Run: `npm run build 2>&1 | grep -E "error TS|error:" | head -20`
Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/shell/AppSidebar.tsx
git commit -m "feat: support mobile drawer mode in AppSidebar"
```

---

### Task 2: Add mobile header and backdrop to AppShell

**Files:**
- Modify: `src/components/shell/AppShell.tsx`

AppShell is currently 19 lines. This task adds mobile nav state, a mobile header bar visible only on `< md`, a backdrop overlay, and wires props to AppSidebar.

- [ ] **Step 1: Read the current file**

Current content of `src/components/shell/AppShell.tsx`:
```tsx
// src/components/shell/AppShell.tsx
'use client';

import { AppSidebar } from './AppSidebar';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite AppShell.tsx with mobile nav support**

Replace the entire file content with:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { imgSrc } from '@/utils/imgSrc';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* Mobile header — hidden on md+ */}
      <header className="md:hidden h-14 flex-shrink-0 flex items-center gap-3 bg-slate-700 border-b border-slate-600 px-4 z-30">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="開啟導覽選單"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center h-8 w-[116px]">
          <Image
            src={imgSrc('/drmn-logo-sidebar.png')}
            alt="DRMN"
            width={120}
            height={40}
            className="h-7 w-full object-contain object-left"
            priority
          />
        </div>
      </header>

      {/* Backdrop — only active when mobile nav is open */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          isMobileNavOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Body row: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          mobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
```

Key changes from the original:
- Outer `div` becomes `flex-col` to stack mobile header above the body row
- Mobile `<header>` added (`md:hidden h-14`)
- Backdrop `div` added (fixed, z-40, transition-opacity)
- Body row `div` wraps `AppSidebar` + `main` as a flex row (same as before)
- `AppSidebar` receives `mobileOpen` and `onMobileClose` props
- No `pt-14` on `<main>` needed — the mobile header is a flex sibling, not overlapping

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | grep -E "error TS|error:" | head -20`
Expected: no TypeScript errors.

- [ ] **Step 4: Run lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: no new lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/AppShell.tsx
git commit -m "feat: add mobile header and nav drawer to AppShell"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Hamburger button in mobile header → `setIsMobileNavOpen(true)` (Task 2)
- ✅ Left drawer slide-in — `translate-x-0` / `-translate-x-full` + `transition-transform duration-300` (Task 1)
- ✅ Backdrop with semi-transparent overlay, tap to close (Task 2)
- ✅ Desktop sidebar fully unchanged — `md:static md:translate-x-0 md:transition-[width]` restores original behaviour (Task 1)
- ✅ Collapse toggle hidden on mobile — `hidden md:flex` (Task 1, Step 4)
- ✅ Drawer always expanded (220px) — `showExpanded = isMobileDrawer || !collapsed` (Task 1, Step 2)
- ✅ Nav link click closes drawer — `onClick={onMobileClose}` (Task 1, Step 6)
- ✅ No changes to navConfig, useSidebarCollapse, or page components

**Type consistency:**
- `AppSidebarProps.mobileOpen: boolean | undefined` defined in Task 1, passed as `mobileOpen={isMobileNavOpen}` (boolean) in Task 2 ✅
- `AppSidebarProps.onMobileClose: (() => void) | undefined` defined in Task 1, passed as `() => setIsMobileNavOpen(false)` in Task 2 ✅
- `showExpanded` used consistently throughout Task 1 in place of `!collapsed` ✅

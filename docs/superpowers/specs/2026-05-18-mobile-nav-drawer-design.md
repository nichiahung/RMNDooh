# Mobile Navigation Drawer — Design Spec

**Date:** 2026-05-18
**Scope:** App Shell — mobile-only navigation drawer

---

## 1. Problem

`AppSidebar` is desktop-first and occupies fixed horizontal space (`w-[220px]` or `w-[60px]`). On mobile viewports it crowds the main content and provides no usable layout. Industry standard (Google Ads, Meta Ads Manager, DV360) is a hamburger-triggered left drawer.

---

## 2. User Experience

### Desktop (≥ md / 768px) — Unchanged

Existing sidebar behaviour is fully preserved: fixed left sidebar, expand/collapse toggle, `useSidebarCollapse` persistence.

### Mobile (< md)

```
┌─────────────────────────────┐
│ ☰  [Logo]                   │  ← Mobile header, h-14, bg-slate-700
├─────────────────────────────┤
│                             │
│   Main content (children)   │
│                             │
└─────────────────────────────┘
```

After tapping ☰:

```
┌──────────┬────────────────────┐
│  Drawer  │ ░░░░ backdrop ░░░░ │  ← backdrop bg-slate-900/50, z-40, tap to close
│  220px   │ ░░░░░░░░░░░░░░░░░░ │
│  z-50    │ ░░░░░░░░░░░░░░░░░░ │
└──────────┴────────────────────┘
```

### Drawer Behaviour

- Slides in from left: `translate-x-0` (open) / `-translate-x-full` (closed), `transition-transform duration-300 ease-out`
- Backdrop fades: `opacity-100` (open) / `opacity-0` (closed), `transition-opacity duration-300`
- **Dismiss:** tap backdrop or tap a nav item
- **Drawer content:** same nav items as desktop, always expanded (no collapse toggle shown)
- **No drag-to-close** — tap backdrop only, keeps implementation simple

---

## 3. Component Architecture

Two files changed, nothing else:

```
src/components/shell/
├── AppShell.tsx     ← add isMobileNavOpen state + mobile header + backdrop
└── AppSidebar.tsx   ← accept mobileOpen/onMobileClose props, render drawer on mobile
```

### AppSidebarProps

```ts
interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}
```

### AppShell changes

- `isMobileNavOpen: boolean` state (default false)
- Mobile header `<div className="md:hidden h-14 bg-slate-700 ...">` containing:
  - Hamburger button (☰ / `Menu` icon from lucide-react) — calls `setIsMobileNavOpen(true)`
  - Logo / app name
- Backdrop `<div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 ...">` — calls `setIsMobileNavOpen(false)`, only pointer-events-auto when open
- Passes `mobileOpen={isMobileNavOpen}` and `onMobileClose={() => setIsMobileNavOpen(false)}` to AppSidebar
- `<main>` gets `pt-14 md:pt-0` to account for the mobile header height

### AppSidebar changes

- **Desktop (`md:`):** `hidden md:flex` — existing layout, ignores new props
- **Mobile:** `fixed inset-y-0 left-0 z-50 flex flex-col w-[220px] bg-slate-700 transition-transform duration-300 ease-out` + `translate-x-0` or `-translate-x-full` based on `mobileOpen`
- Hide the collapse toggle button on mobile (`hidden md:flex` on that button)
- Each nav `<Link>` calls `onMobileClose?.()` on click (via `onClick`)

---

## 4. Out of Scope

- Drag-to-close gesture
- Bottom tab bar
- Changes to navConfig, useSidebarCollapse, or any page components
- Admin sidebar (separate route, not part of AppShell)

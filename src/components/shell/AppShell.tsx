'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileTabBar } from './MobileTabBar';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-50">

      {/* Backdrop — shown behind drawer on mobile */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          isMobileNavOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Body row: sidebar (desktop) + main */}
      <div className="flex flex-1 min-h-0">
        <AppSidebar
          mobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
        {/* pb-16 md:pb-0: reserve space for the mobile tab bar */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <MobileTabBar onMoreClick={() => setIsMobileNavOpen(true)} />

    </div>
  );
}

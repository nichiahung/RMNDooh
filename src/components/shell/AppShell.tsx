'use client';

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { MobileTabBar } from './MobileTabBar';
import { getMobileTabBarVisibility } from '@/utils/mobileTabBarVisibility';
import type { UIEvent } from 'react';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mobileTabBarState, setMobileTabBarState] = useState({
    pathname,
    visible: true,
  });
  const previousScrollTopRef = useRef(0);
  const isNewPathname = mobileTabBarState.pathname !== pathname;
  const isMobileTabBarVisible = isNewPathname || mobileTabBarState.visible;

  const handleMainScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const currentScrollTop = Math.max(0, target.scrollTop);
      const previousScrollTop = isNewPathname ? 0 : previousScrollTopRef.current;
      const nextVisible = getMobileTabBarVisibility({
        currentScrollTop,
        previousScrollTop,
        scrollHeight: target.scrollHeight,
        clientHeight: target.clientHeight,
        isDrawerOpen: isMobileNavOpen,
        previousVisible: isMobileTabBarVisible,
      });

      previousScrollTopRef.current = currentScrollTop;

      if (isNewPathname || nextVisible !== mobileTabBarState.visible) {
        setMobileTabBarState({ pathname, visible: nextVisible });
      }
    },
    [isMobileNavOpen, isMobileTabBarVisible, isNewPathname, mobileTabBarState.visible, pathname],
  );

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
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0"
          onScroll={handleMainScroll}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <MobileTabBar
        visible={isMobileTabBarVisible || isMobileNavOpen}
        onMoreClick={() => setIsMobileNavOpen(true)}
      />

    </div>
  );
}

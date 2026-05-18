'use client';

import { useState, useRef, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileTabBar } from './MobileTabBar';
import { getMobileTabBarVisibility } from '@/utils/mobileTabBarVisibility';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const prevScrollTop = useRef(0);
  const prevVisible = useRef(true);
  const isMobileNavOpenRef = useRef(false);

  useEffect(() => {
    isMobileNavOpenRef.current = isMobileNavOpen;
  }, [isMobileNavOpen]);

  // Show tab bar immediately when drawer opens, regardless of scroll state.
  useEffect(() => {
    if (isMobileNavOpen && !prevVisible.current) {
      prevVisible.current = true;
      setIsTabBarVisible(true);
    }
  }, [isMobileNavOpen]);

  // Use capture-phase scroll on document so nested scrollable containers
  // (e.g. InventoryDiscovery's own overflow-y-auto div) are also detected.
  // Scroll events don't bubble, but capture phase reaches every target.
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el || el === document.documentElement || el === document.body) return;

      const currentScrollTop = el.scrollTop;
      const visible = getMobileTabBarVisibility({
        currentScrollTop,
        previousScrollTop: prevScrollTop.current,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        isDrawerOpen: isMobileNavOpenRef.current,
        previousVisible: prevVisible.current,
      });
      prevScrollTop.current = currentScrollTop;
      if (visible !== prevVisible.current) {
        prevVisible.current = visible;
        setIsTabBarVisible(visible);
      }
    };

    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <div className="h-dvh min-h-svh flex flex-col bg-slate-50">

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
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden md:pb-0 transition-[padding-bottom] duration-200 ${isTabBarVisible ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-0'}`}
        >
          {children}
        </main>
      </div>

      {/* Bottom tab bar — fixed to bottom on mobile, slides out on scroll down */}
      <MobileTabBar
        onMoreClick={() => setIsMobileNavOpen(true)}
        visible={isTabBarVisible}
      />

    </div>
  );
}

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
  const mainRef = useRef<HTMLElement>(null);
  const prevScrollTop = useRef(0);
  const prevVisible = useRef(true);
  const isMobileNavOpenRef = useRef(false);
  isMobileNavOpenRef.current = isMobileNavOpen;

  // Show tab bar immediately when drawer opens, regardless of scroll state.
  useEffect(() => {
    if (isMobileNavOpen && !prevVisible.current) {
      prevVisible.current = true;
      setIsTabBarVisible(true);
    }
  }, [isMobileNavOpen]);

  // Attach scroll listener directly to the DOM element (more reliable than
  // React synthetic onScroll on iOS Safari momentum scrolling).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const handleScroll = () => {
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

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
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

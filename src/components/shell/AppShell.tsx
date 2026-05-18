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
    <div className="h-screen flex flex-col bg-slate-50">

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

      {/* Body row: sidebar + main */}
      <div className="flex flex-1 min-h-0">
        <AppSidebar
          mobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
        {/*
          overflow-hidden moved from outer div to main.
          The outer div must NOT have overflow-hidden so AppSidebar's
          absolute collapse toggle button (-right-3) is not clipped.
        */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ImageIcon, Plus } from 'lucide-react';

export function AppNav() {
  const pathname = usePathname();

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
        </nav>
      </div>
      <Link
        href="/campaign-planner"
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" /> 新增活動
      </Link>
    </header>
  );
}

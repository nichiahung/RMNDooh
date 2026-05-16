'use client';

import Link from 'next/link';
import Image from 'next/image';
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
        <Image src="/drmn-logo.png" alt="DRMN" height={28} width={100} className="object-contain" />
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

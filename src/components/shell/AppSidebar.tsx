'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Monitor, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { NAV_CONFIG, type NavItem } from './navConfig';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';

export function AppSidebar() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapse();

  const [pendingProposalCount, setPendingProposalCount] = useState(0);

  const role = currentUser?.role ?? 'advertiser';
  const sections = NAV_CONFIG[role] ?? [];

  useEffect(() => {
    if (role === 'sales') {
      listAdminProposalsApi()
        .then(({ countsByStatus }) => {
          const count =
            (countsByStatus.sent_to_advertiser ?? 0) +
            (countsByStatus.viewed_by_advertiser ?? 0) +
            (countsByStatus.change_requested ?? 0) +
            (countsByStatus.revised ?? 0);
          setPendingProposalCount(count);
        })
        .catch(() => setPendingProposalCount(0));
    }
  }, [role]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  function resolveBadge(badge: NavItem['badge']): number {
    if (badge === 'proposals_pending') return pendingProposalCount;
    return 0;
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`bg-slate-800 border-r border-slate-700 flex flex-col h-full flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-3 border-b border-slate-700 flex-shrink-0">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 text-white font-bold text-sm tracking-wide whitespace-nowrap">DRMN</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badgeCount = resolveBadge(item.badge);
                return (
                  <div key={item.id}>
                    <Link
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      )}
                      {!collapsed && badgeCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {badgeCount}
                        </span>
                      )}
                      {collapsed && (
                        <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                          {item.label}{badgeCount > 0 ? ` (${badgeCount})` : ''}
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-slate-700 space-y-0.5">
        <button
          onClick={toggle}
          className="group relative w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors text-sm font-medium"
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
            : <ChevronLeft className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && <span className="whitespace-nowrap">收合側欄</span>}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
              展開側欄
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="group relative w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors text-sm font-medium"
          aria-label="登出"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">登出</span>}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
              登出
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

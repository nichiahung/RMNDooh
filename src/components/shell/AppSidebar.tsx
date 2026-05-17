'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { imgSrc } from '@/utils/imgSrc';
import { NAV_CONFIG, type NavItem } from './navConfig';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { listMediaAssets } from '@/lib/api/creatives';

export function AppSidebar() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapse();

  const [pendingProposalCount, setPendingProposalCount] = useState(0);
  const [creativeAttentionCount, setCreativeAttentionCount] = useState(0);

  const role = currentUser?.role ?? 'advertiser';
  const sections = NAV_CONFIG[role] ?? [];
  const roleLabel = {
    advertiser: 'Advertiser',
    sales: 'Sales',
    admin: 'Admin',
  }[role];
  const accountInitial = currentUser?.email?.trim().charAt(0).toUpperCase() || 'U';

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

  useEffect(() => {
    if (role === 'advertiser') {
      listMediaAssets()
        .then(assets => {
          const count = assets.filter(asset =>
            asset.approvalStatus === 'pending_review' || asset.approvalStatus === 'rejected'
          ).length;
          setCreativeAttentionCount(count);
        })
        .catch(() => setCreativeAttentionCount(0));
    }
  }, [role]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  function resolveBadge(badge: NavItem['badge']): number {
    if (badge === 'proposals_pending') return pendingProposalCount;
    if (badge === 'creative_attention') return creativeAttentionCount;
    return 0;
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`relative bg-slate-700 border-r border-slate-600 flex flex-col h-full flex-shrink-0 overflow-visible transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Brand */}
      <div className={`h-14 flex items-center border-b border-slate-600 flex-shrink-0 ${
        collapsed ? 'justify-between gap-1 px-2' : 'justify-between gap-2 px-3'
      }`}>
        <div className={`flex h-8 flex-shrink-0 items-center overflow-hidden ${
          collapsed ? 'w-6' : 'w-[116px]'
        }`}>
          <Image
            src={imgSrc('/drmn-logo-sidebar.png')}
            alt="DRMN"
            width={120}
            height={40}
            className={`h-7 max-w-none object-contain ${collapsed ? 'w-[84px] object-left' : 'w-full'}`}
            priority
          />
        </div>
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                          ? 'bg-white/15 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {collapsed && badgeCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-700" />
                      )}
                      {!collapsed && (
                        <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      )}
                      {!collapsed && badgeCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {badgeCount}
                        </span>
                      )}
                      {collapsed && (
                        <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
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
      <div className="p-2 border-t border-slate-600 space-y-0.5">
        <div
          className="group relative mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-slate-300"
          aria-label={`目前登入：${currentUser?.email ?? 'Unknown'}`}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
            {accountInitial}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">{roleLabel}</div>
              <div className="truncate text-xs font-medium text-slate-200">{currentUser?.email ?? 'Unknown user'}</div>
            </div>
          )}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden min-w-[180px] group-hover:block rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 shadow-lg pointer-events-none">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-300">{roleLabel}</span>
              <span className="block font-medium">{currentUser?.email ?? 'Unknown user'}</span>
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="group relative w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          aria-label="登出"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">登出</span>}
          {collapsed && (
            <span className="absolute left-[52px] z-50 hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
              登出
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

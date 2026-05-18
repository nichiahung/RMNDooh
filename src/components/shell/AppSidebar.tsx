'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Globe, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { imgSrc } from '@/utils/imgSrc';
import { NAV_CONFIG, type NavItem } from './navConfig';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { listMediaAssets } from '@/lib/api/creatives';
import { useI18n } from '@/i18n/I18nProvider';

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps = {}) {
  const { currentUser, logout } = useAuth();
  const { t, toggleLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapse();

  // When the mobile drawer is actively open, always show expanded layout.
  // On desktop (mobileOpen=false), respect the collapsed state.
  const showExpanded = mobileOpen === true || !collapsed;

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
      className={[
        // Shared visual styles
        'flex flex-col bg-slate-700 border-r border-slate-600 overflow-visible',
        // Mobile: fixed overlay drawer
        'fixed inset-y-0 left-0 z-50 w-[220px]',
        'transition-transform duration-300 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop overrides (md+): restore in-flow sidebar behaviour
        'md:static md:inset-auto md:z-auto',
        'md:h-full md:flex-shrink-0',
        'md:translate-x-0',
        'md:transition-[width] md:duration-200 md:ease-in-out',
        collapsed ? 'md:w-[72px]' : 'md:w-[220px]',
      ].join(' ')}
    >
      {/* Brand */}
      <div className={`h-16 flex items-center border-b border-slate-600 flex-shrink-0 ${
        showExpanded ? 'px-4' : 'justify-center px-2'
      }`}>
        <div className={`flex h-8 flex-shrink-0 items-center overflow-hidden ${
          showExpanded ? 'w-[116px]' : 'w-9'
        }`}>
          <Image
            src={imgSrc('/drmn-logo-sidebar.png')}
            alt="DRMN"
            width={120}
            height={40}
            className={`max-w-none object-contain ${showExpanded ? 'h-7 w-full' : 'h-8 w-[96px] object-left'}`}
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-3 ${showExpanded ? 'px-2 space-y-4' : 'px-3 space-y-3'}`}>
        {sections.map(section => (
          <div key={section.label}>
            {showExpanded && (
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
                      onClick={onMobileClose}
                      className={`group relative flex rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${showExpanded ? 'items-center gap-2.5 px-2 py-2' : 'h-12 items-center justify-center px-0'}`}
                    >
                      <Icon className={`${showExpanded ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
                      {!showExpanded && badgeCount > 0 && (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-700" />
                      )}
                      {showExpanded && (
                        <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      )}
                      {showExpanded && badgeCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {badgeCount}
                        </span>
                      )}
                      {!showExpanded && (
                        <span className="absolute left-full ml-2 z-[1300] hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
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
      <div className={`border-t border-slate-600 ${showExpanded ? 'p-2 space-y-0.5' : 'p-3 space-y-2'}`}>
        {/* Collapse toggle — desktop only, always inside sidebar */}
        <button
          onClick={toggle}
          className={`group hidden md:flex w-full rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors ${
            showExpanded
              ? 'items-center gap-2.5 px-2 py-2 text-sm font-medium'
              : 'h-12 items-center justify-center'
          }`}
          aria-label={collapsed ? '展開側欄' : '收合側欄'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
            : <ChevronLeft className="w-4 h-4 flex-shrink-0" />}
          {showExpanded && <span className="whitespace-nowrap text-xs">收合側欄</span>}
          {!showExpanded && (
            <span className="absolute left-full ml-2 z-[1300] hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
              展開側欄
            </span>
          )}
        </button>
        <div
          className={`group relative flex items-center rounded-xl text-slate-300 ${
            showExpanded ? 'mb-2 gap-2.5 px-2 py-2' : 'h-12 justify-center px-0'
          }`}
          aria-label={`目前登入：${currentUser?.email ?? 'Unknown'}`}
        >
          <div className={`${showExpanded ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'} flex flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 font-bold text-white`}>
            {accountInitial}
          </div>
          {showExpanded && (
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">{roleLabel}</div>
              <div className="truncate text-xs font-medium text-slate-200">{currentUser?.email ?? 'Unknown user'}</div>
            </div>
          )}
          {!showExpanded && (
            <span className="absolute left-full ml-2 z-[1300] hidden min-w-[180px] group-hover:block rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 shadow-lg pointer-events-none">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-300">{roleLabel}</span>
              <span className="block font-medium">{currentUser?.email ?? 'Unknown user'}</span>
            </span>
          )}
        </div>
        <button
          onClick={toggleLocale}
          className={`group relative flex w-full rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium ${
            showExpanded ? 'items-center gap-2.5 px-2 py-2' : 'h-12 items-center justify-center px-0'
          }`}
          aria-label={`${t('common.switchLanguage')}: ${t('common.langToggle')}`}
        >
          <Globe className={`${showExpanded ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
          {showExpanded && (
            <>
              <span className="flex-1 whitespace-nowrap">{t('common.language')}</span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-100">
                {t('common.langToggle')}
              </span>
            </>
          )}
          {!showExpanded && (
            <span className="absolute left-full ml-2 z-[1300] hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
              {t('common.switchLanguage')}: {t('common.langToggle')}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className={`group relative flex w-full rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium ${
            showExpanded ? 'items-center gap-2.5 px-2 py-2' : 'h-12 items-center justify-center px-0'
          }`}
          aria-label="登出"
        >
          <LogOut className={`${showExpanded ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
          {showExpanded && <span className="whitespace-nowrap">登出</span>}
          {!showExpanded && (
            <span className="absolute left-full ml-2 z-[1300] hidden group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-600 whitespace-nowrap shadow-lg pointer-events-none">
              登出
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

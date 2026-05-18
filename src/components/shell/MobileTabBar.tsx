'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Megaphone,
  FileText,
  Image as ImageIcon,
  ClipboardList,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { LucideIcon } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const ADVERTISER_TABS: TabItem[] = [
  { id: 'home', label: '首頁', icon: Home, href: '/' },
  { id: 'campaign-planner', label: '活動', icon: Megaphone, href: '/campaign-planner' },
  { id: 'proposals', label: '提案', icon: FileText, href: '/proposal-review' },
  { id: 'assets', label: '素材', icon: ImageIcon, href: '/assets' },
];

const SALES_TABS: TabItem[] = [
  { id: 'home', label: '首頁', icon: Home, href: '/' },
  { id: 'proposals-pending', label: '提案', icon: FileText, href: '/proposal-review' },
  { id: 'proposals-all', label: '新增', icon: ClipboardList, href: '/proposal-builder' },
  { id: 'clients', label: '客戶', icon: Users, href: '/clients' },
];

interface Props {
  onMoreClick: () => void;
  visible?: boolean;
}

export function MobileTabBar({ onMoreClick, visible = true }: Props) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'advertiser';
  const tabs = role === 'sales' ? SALES_TABS : ADVERTISER_TABS;

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] motion-safe:transition-transform motion-safe:duration-200 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
              active ? 'text-indigo-600' : 'text-slate-500 active:text-slate-700'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-500 active:text-slate-700 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 stroke-2" />
        <span>更多</span>
      </button>
    </nav>
  );
}

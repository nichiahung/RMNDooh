'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Map,
  Monitor,
  Settings,
  LogOut,
  X,
  FileText,
  ClipboardList,
  CalendarCheck,
  DollarSign,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { getAdminDashboardWorkQueuesApi } from '@/lib/api/tradingIterationApi';
import { computeSidebarBadges, type SidebarBadges } from '@/utils/adminSidebarBadges';

export type AdminTab =
  | 'overview'
  | 'campaign-drafts'
  | 'proposals'
  | 'bookings'
  | 'creative'
  | 'launch-readiness'
  | 'inventory'
  | 'screens'
  | 'pricing';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badgeKey?: keyof SidebarBadges;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: '廣告主自助',
    items: [
      { id: 'campaign-drafts', label: 'Campaign Drafts', icon: ClipboardList },
    ],
  },
  {
    label: '業務銷售',
    items: [
      { id: 'proposals', label: 'Proposals', icon: FileText, badgeKey: 'proposals' },
    ],
  },
  {
    label: '訂單履約',
    items: [
      { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badgeKey: 'bookings' },
      { id: 'creative', label: 'Creative Review', icon: ImageIcon, badgeKey: 'creative' },
      { id: 'launch-readiness', label: 'Launch Readiness', icon: Rocket, badgeKey: 'launch-readiness' },
    ],
  },
  {
    label: '系統管理',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Map },
      { id: 'screens', label: 'Screens', icon: Monitor },
      { id: 'pricing', label: 'Pricing', icon: DollarSign },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, isOpen, onClose }: Props) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarCollapse();
  const [badges, setBadges] = useState<SidebarBadges | null>(null);

  useEffect(() => {
    getAdminDashboardWorkQueuesApi().then(q => setBadges(computeSidebarBadges(q)));
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const handleTabChange = (tab: AdminTab) => {
    onTabChange(tab);
    onClose();
  };

  function NavButton({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
    return (
      <button
        onClick={() => handleTabChange(item.id)}
        className={`relative group w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
          isActive ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'} ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        {!collapsed && badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {collapsed && (
          <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
            {item.label}{badge > 0 ? ` (${badge})` : ''}
          </span>
        )}
      </button>
    );
  }

  const overviewBadge = badges?.overview ?? 0;

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-40 transform transition-transform transition-[width] duration-200 ease-in-out lg:transform-none overflow-hidden w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]'}`}
      >
        {/* Brand */}
        <div className={`h-16 flex items-center border-b border-slate-800 ${collapsed ? 'lg:justify-center lg:px-3 px-6 justify-between' : 'justify-between px-6'}`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 bg-indigo-500 rounded flex items-center justify-center flex-shrink-0 ${collapsed ? 'lg:mr-0 mr-3' : 'mr-3'}`}>
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className={`text-white font-bold tracking-wide ${collapsed ? 'lg:hidden' : ''}`}>{t('admin.brand')}</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          {/* Standalone overview item */}
          <div>
            <button
              onClick={() => handleTabChange('overview')}
              className={`relative group w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'} ${activeTab === 'overview' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className={collapsed ? 'lg:hidden' : ''}>Dashboard</span>
              {!collapsed && overviewBadge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {overviewBadge > 99 ? '99+' : overviewBadge}
                </span>
              )}
              {collapsed && (
                <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                  Dashboard{overviewBadge > 0 ? ` (${overviewBadge})` : ''}
                </span>
              )}
            </button>
          </div>

          {/* Grouped sections */}
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${collapsed ? 'lg:hidden' : ''}`}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavButton key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button
            onClick={toggle}
            className="group relative hidden lg:flex w-full items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label={collapsed ? '展開側欄' : '收合側欄'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
              : <><ChevronLeft className="w-4 h-4 flex-shrink-0 mr-3" /><span>收合側欄</span></>
            }
            {collapsed && (
              <span className="absolute left-[52px] z-50 hidden lg:group-hover:block bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg pointer-events-none">
                展開側欄
              </span>
            )}
          </button>
          <button className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} />
            <span className={collapsed ? 'lg:hidden' : ''}>{t('admin.nav.settings')}</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mr-3 lg:mr-0' : 'mr-3'}`} />
            <span className={collapsed ? 'lg:hidden' : ''}>{t('admin.nav.signOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

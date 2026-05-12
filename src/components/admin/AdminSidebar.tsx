'use client';

import {
  LayoutDashboard,
  Megaphone,
  Image as ImageIcon,
  Map,
  Monitor,
  Settings,
  LogOut
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export type AdminTab = 'overview' | 'campaigns' | 'creative' | 'inventory' | 'screens';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: Props) {
  const { t } = useI18n();

  const navItems = [
    { id: 'overview', labelKey: 'admin.nav.overview', icon: LayoutDashboard },
    { id: 'campaigns', labelKey: 'admin.nav.campaigns', icon: Megaphone },
    { id: 'creative', labelKey: 'admin.nav.creative', icon: ImageIcon },
    { id: 'inventory', labelKey: 'admin.nav.inventory', icon: Map },
    { id: 'screens', labelKey: 'admin.nav.screens', icon: Monitor },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-20">

      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center mr-3">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold tracking-wide">{t('admin.brand')}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as AdminTab)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings */}
      <div className="p-4 border-t border-slate-800 space-y-1">
        <button className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <Settings className="w-4 h-4 mr-3" /> {t('admin.nav.settings')}
        </button>
        <button className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 mr-3" /> {t('admin.nav.signOut')}
        </button>
      </div>

    </aside>
  );
}

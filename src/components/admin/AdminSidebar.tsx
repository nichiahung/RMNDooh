'use client';

import {
  LayoutDashboard,
  Megaphone,
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
  Library,
  CheckCircle,
  Shield,
  Rocket,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export type AdminTab =
  | 'overview'
  | 'proposals'
  | 'campaign-drafts'
  | 'bookings'
  | 'campaigns'
  | 'inventory'
  | 'pricing'
  | 'creative-library'
  | 'creative'
  | 'creative-coverage'
  | 'launch-readiness'
  | 'screens';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ activeTab, onTabChange, isOpen, onClose }: Props) {
  const { t } = useI18n();

  const navSections = [
    {
      label: 'Operations',
      items: [
        { id: 'overview', label: t('admin.nav.overview'), icon: LayoutDashboard },
        { id: 'proposals', label: 'Proposals', icon: FileText },
        { id: 'campaign-drafts', label: 'Campaign Drafts', icon: ClipboardList },
        { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
        { id: 'campaigns', label: t('admin.nav.campaigns'), icon: Megaphone },
      ],
    },
    {
      label: 'Commerce',
      items: [
        { id: 'inventory', label: t('admin.nav.inventory'), icon: Map },
        { id: 'pricing', label: 'Pricing & Rate Cards', icon: DollarSign },
        { id: 'screens', label: t('admin.nav.screens'), icon: Monitor },
      ],
    },
    {
      label: 'Creative',
      items: [
        { id: 'creative-library', label: 'Creative Library', icon: Library },
        { id: 'creative', label: t('admin.nav.creative'), icon: ImageIcon },
        { id: 'creative-coverage', label: 'Coverage', icon: CheckCircle },
      ],
    },
    {
      label: 'Launch',
      items: [
        { id: 'launch-readiness', label: 'Launch Readiness', icon: Rocket },
      ],
    },
  ];

  const handleTabChange = (tab: AdminTab) => {
    onTabChange(tab);
    onClose();
  };

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
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col h-full flex-shrink-0 z-40 transform transition-transform duration-200 lg:transform-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >

      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center mr-3">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold tracking-wide">{t('admin.brand')}</span>
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
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id as AdminTab)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
    </>
  );
}

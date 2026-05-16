'use client';

import { Map, List, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export type ViewMode = 'list' | 'map' | 'ai';

interface Props {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: Props) {
  const { t } = useI18n();

  const activeClass = 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50';
  const inactiveClass = 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50';

  return (
    <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner flex-shrink-0">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'list' ? activeClass : inactiveClass}`}
      >
        <List className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('planner.listView')}</span>
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`flex items-center px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'map' ? activeClass : inactiveClass}`}
      >
        <Map className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('planner.mapView')}</span>
      </button>
      <button
        onClick={() => onViewChange('ai')}
        className={`flex items-center px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : inactiveClass}`}
      >
        <Sparkles className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">AI 建議</span>
      </button>
    </div>
  );
}

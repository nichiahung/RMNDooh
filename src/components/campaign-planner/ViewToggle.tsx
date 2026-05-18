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
  const buttonClass = 'flex h-8 w-9 items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner flex-shrink-0" aria-label="View mode">
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={`${buttonClass} ${currentView === 'list' ? activeClass : inactiveClass}`}
        aria-label={t('planner.listView')}
        title={t('planner.listView')}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange('map')}
        className={`${buttonClass} ${currentView === 'map' ? activeClass : inactiveClass}`}
        aria-label={t('planner.mapView')}
        title={t('planner.mapView')}
      >
        <Map className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange('ai')}
        className={`${buttonClass} ${currentView === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : inactiveClass}`}
        aria-label="AI 建議"
        title="AI 建議"
      >
        <Sparkles className="h-4 w-4" />
      </button>
    </div>
  );
}

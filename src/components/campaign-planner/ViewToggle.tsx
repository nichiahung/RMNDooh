'use client';

import { Map, List } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

export function ViewToggle({ currentView, onViewChange }: Props) {
  const { t } = useI18n();

  return (
    <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner flex-shrink-0">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'list' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
      >
        <List className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('planner.listView')}</span>
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`flex items-center px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'map' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
      >
        <Map className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{t('planner.mapView')}</span>
      </button>
    </div>
  );
}

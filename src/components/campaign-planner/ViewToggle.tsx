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
    <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'list' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
      >
        <List className="w-4 h-4 mr-2" />{t('planner.listView')}
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'map' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
      >
        <Map className="w-4 h-4 mr-2" />{t('planner.mapView')}
      </button>
    </div>
  );
}

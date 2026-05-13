'use client';

import { ArrowDownUp } from 'lucide-react';
import { ViewToggle } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  resultCount: number;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
}

export function PlannerTopbar({ resultCount, sortOption, onSortChange, currentView, onViewChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
        {resultCount} {t('planner.locations')}
      </span>
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          <select
            className="block pl-2 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-transparent border-transparent focus:outline-none focus:ring-0 cursor-pointer hover:text-slate-900 transition-colors"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="impressions_desc">{t('sort.impressionsDesc')}</option>
            <option value="impressions_asc">{t('sort.impressionsAsc')}</option>
            <option value="price_desc">{t('sort.priceDesc')}</option>
            <option value="price_asc">{t('sort.priceAsc')}</option>
            <option value="cpm_desc">{t('sort.cpmDesc')}</option>
            <option value="cpm_asc">{t('sort.cpmAsc')}</option>
          </select>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <ViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>
    </div>
  );
}

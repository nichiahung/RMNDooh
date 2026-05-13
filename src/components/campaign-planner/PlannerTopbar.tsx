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
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm gap-2 min-w-0">
      <span className="text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md whitespace-nowrap flex-shrink-0">
        {resultCount} {t('planner.locations')}
      </span>
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 hidden sm:block" />
          <select
            className="block max-w-[120px] sm:max-w-none pl-1 sm:pl-2 pr-5 sm:pr-8 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-transparent border-transparent focus:outline-none focus:ring-0 cursor-pointer hover:text-slate-900 transition-colors"
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
        <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
        <ViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>
    </div>
  );
}

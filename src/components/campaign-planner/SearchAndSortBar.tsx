import React from 'react';
import { Search, ArrowDownUp } from 'lucide-react';
import { ViewToggle } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  resultCount: number;
}

export function SearchAndSortBar({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  resultCount
}: Props) {
  const { t } = useI18n();
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 shadow-sm gap-3">

      {/* Search Input */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <div className="relative flex-1 sm:flex-none sm:w-72 md:w-96 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            placeholder={t('planner.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          {resultCount} {t('planner.locations')}
        </span>
      </div>

      {/* Sort & View Toggle */}
      <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-5 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          <select 
            className="block w-full pl-2 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-transparent border-transparent focus:outline-none focus:ring-0 cursor-pointer hover:text-slate-900 transition-colors"
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

        <div className="h-5 w-px bg-slate-200"></div>

        <ViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>
    </div>
  );
}

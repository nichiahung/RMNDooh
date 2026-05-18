'use client';

import { ArrowDownUp, ChevronDown, Plus } from 'lucide-react';
import { ViewToggle, ViewMode } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  resultCount: number;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  addableCount?: number;
  onAddAll?: () => void;
}

const SORT_OPTIONS = [
  { value: 'impressions_desc', key: 'sort.impressionsDesc' },
  { value: 'impressions_asc',  key: 'sort.impressionsAsc'  },
  { value: 'price_desc',       key: 'sort.priceDesc'       },
  { value: 'price_asc',        key: 'sort.priceAsc'        },
  { value: 'cpm_desc',         key: 'sort.cpmDesc'         },
  { value: 'cpm_asc',          key: 'sort.cpmAsc'          },
] as const;

export function PlannerTopbar({ resultCount, sortOption, onSortChange, currentView, onViewChange, addableCount = 0, onAddAll }: Props) {
  const { t } = useI18n();

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortOption);
  const showSort = currentView === 'list';
  const showAddAll = currentView !== 'ai' && addableCount > 0 && Boolean(onAddAll);

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 sticky top-0 z-20 shadow-sm min-w-0">

      {/* Count pill — always visible */}
      <span className="text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md whitespace-nowrap flex-shrink-0">
        {currentView === 'ai' ? 'AI 版位建議' : `${resultCount} ${t('planner.locations')}`}
      </span>

      {/* Sort control — only in List view; grows to fill space */}
      {showSort && (
        <div className="relative flex items-center flex-1 min-w-0 h-8">
          {/* Visual pill */}
          <div className="flex items-center w-full h-full pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none select-none gap-1.5 hover:border-slate-300 transition-colors">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700 truncate">
              {currentLabel ? t(currentLabel.key) : sortOption}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 absolute right-2" />
          </div>
          {/* Native select overlaid — provides click + keyboard behaviour */}
          <select
            aria-label="Sort inventory"
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{t(o.key)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add all — shown when there are unselected filtered results */}
      {showAddAll && (
        <button
          onClick={onAddAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 h-8 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex-shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add all ({addableCount})
        </button>
      )}

      {/* View toggle — always pinned to right */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {(showSort || showAddAll) && <div className="h-4 w-px bg-slate-200" />}
        <ViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>

    </div>
  );
}

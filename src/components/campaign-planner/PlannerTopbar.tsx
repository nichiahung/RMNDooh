'use client';

import { ArrowDownUp, ChevronDown, Filter, Plus } from 'lucide-react';
import { ViewToggle, ViewMode } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';
import { getSortLabelCompact } from '@/utils/sortLabel';

interface Props {
  resultCount: number;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
  addAllCount?: number;
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

export function PlannerTopbar({
  resultCount,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  activeFilterCount = 0,
  onOpenFilters,
  addAllCount = 0,
  onAddAll,
}: Props) {
  const { t } = useI18n();

  const showSort = currentView === 'list';
  const showFilters = currentView !== 'ai' && Boolean(onOpenFilters);
  const showAddAll = currentView !== 'ai' && Boolean(onAddAll);

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-20 shadow-sm min-w-0">
      <div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
        {showFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              activeFilterCount > 0
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50 hover:border-indigo-600'
                : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
            aria-label={t('filter.open')}
            title={t('filter.open')}
          >
            <Filter className="h-4 w-4 flex-shrink-0" />
          </button>
        )}

        {showAddAll && (
          <button
            type="button"
            onClick={onAddAll}
            disabled={addAllCount === 0}
            className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            aria-label={addAllCount > 0 ? `加入 ${addAllCount} 個版位` : '目前篩選結果都已加入'}
            title={resultCount > addAllCount ? `${resultCount} 個篩選結果，其中 ${addAllCount} 個可加入` : `${resultCount} 個篩選結果`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">
              {addAllCount > 0 ? `加入 ${addAllCount} 個版位` : '全部已加入'}
            </span>
          </button>
        )}

        {!showAddAll && (
          <span className="inline-flex h-9 min-w-0 flex-1 items-center text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2.5 sm:px-3 rounded-lg truncate">
            {currentView === 'ai' ? 'AI 版位建議' : `${resultCount} ${t('planner.locations')}`}
          </span>
        )}

        {/* Sort control — only in List view */}
        {showSort && (
          <div className="relative flex h-9 flex-shrink-0 items-center">
            {/* Visual pill */}
            <div className="flex items-center h-full pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none select-none gap-1.5 hover:border-slate-300 transition-colors">
              <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
                {getSortLabelCompact(sortOption)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 absolute right-2" />
            </div>
            {/* Native select overlaid */}
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

        {/* View toggle — pinned right */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {(showFilters || showSort || showAddAll) && <div className="hidden sm:block h-4 w-px bg-slate-200" />}
          <ViewToggle currentView={currentView} onViewChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}

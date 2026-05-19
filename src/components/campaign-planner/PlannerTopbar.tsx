'use client';

import { Filter, Plus } from 'lucide-react';
import { ViewToggle, ViewMode } from './ViewToggle';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  resultCount: number;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
  addAllCount?: number;
  onAddAll?: () => void;
}

export function PlannerTopbar({
  resultCount,
  currentView,
  onViewChange,
  activeFilterCount = 0,
  onOpenFilters,
  addAllCount = 0,
  onAddAll,
}: Props) {
  const { t } = useI18n();

  const showFilters = currentView !== 'ai' && Boolean(onOpenFilters);
  const showAddAll = currentView !== 'ai' && Boolean(onAddAll);
  const addAllLabel =
    addAllCount === 0
      ? '全部已加入'
      : addAllCount === resultCount
        ? '全部加入'
        : `剩餘${addAllCount}個`;

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-20 shadow-sm min-w-0">
      <div className="flex flex-nowrap items-center gap-1.5 sm:gap-3 min-w-0">
        {showFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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
            className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            aria-label={addAllCount > 0 ? `加入 ${addAllCount} 個版位` : '目前篩選結果都已加入'}
            title={resultCount > addAllCount ? `${resultCount} 個篩選結果，其中 ${addAllCount} 個可加入` : `${resultCount} 個篩選結果`}
          >
            <Plus className="mr-0.5 h-3.5 w-3.5" />
            <span className="whitespace-nowrap">
              {addAllLabel}
            </span>
          </button>
        )}

        {!showAddAll && (
          <span className="inline-flex h-10 min-w-0 flex-1 items-center text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 px-2.5 sm:px-3 rounded-lg truncate">
            {currentView === 'ai' ? 'AI 版位建議' : `${resultCount} ${t('planner.locations')}`}
          </span>
        )}

        {/* View toggle — pinned right */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {(showFilters || showAddAll) && <div className="hidden sm:block h-4 w-px bg-slate-200" />}
          <ViewToggle currentView={currentView} onViewChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}

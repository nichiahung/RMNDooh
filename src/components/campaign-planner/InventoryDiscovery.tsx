'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';
import { ViewMode } from './ViewToggle';
import { AiMediaPlannerView } from './AiMediaPlannerView';
import { Filter } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  inventory: InventoryLocation[];
  allInventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
}

export function InventoryDiscovery({
  inventory,
  allInventory,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd,
  objective,
  activeFilterCount,
  onOpenFilters,
}: Props) {
  const { t } = useI18n();
  const showFloatingFilterButton = currentView !== 'ai' && Boolean(onOpenFilters);

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      <PlannerTopbar
        resultCount={inventory.length}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="relative flex-1 overflow-y-auto custom-scrollbar">
        {showFloatingFilterButton && (
          <button
            type="button"
            onClick={onOpenFilters}
            className="absolute left-4 top-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-900/10 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label={t('filter.open')}
            title={t('filter.open')}
          >
            <Filter className="h-4 w-4 flex-shrink-0" />
            <span>{t('filter.title')}</span>
            {(activeFilterCount ?? 0) > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            objective={objective}
            reserveFilterSpace={showFloatingFilterButton}
          />
        ) : currentView === 'map' ? (
          <MapWrapper
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
          />
        ) : (
          <AiMediaPlannerView
            allInventory={allInventory}
            selectedItems={selectedItems}
            onAdd={onAdd}
          />
        )}
      </div>
    </div>
  );
}

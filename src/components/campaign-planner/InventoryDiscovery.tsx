'use client';

import { ClipboardList } from 'lucide-react';
import { InventoryLocation, MediaPlanAddOptions, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';
import { ViewMode } from './ViewToggle';
import { AiMediaPlannerView } from './AiMediaPlannerView';

interface Props {
  inventory: InventoryLocation[];
  allInventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation, options?: MediaPlanAddOptions) => void;
  onRemove: (inventoryId: string) => void;
  objective?: string;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
  onOpenSummary?: () => void;
  showTopbar?: boolean;
  flightStart: string | null;
  flightEnd: string | null;
  onFlightDateChange: (start: string | null, end: string | null) => void;
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
  onRemove,
  objective,
  activeFilterCount,
  onOpenFilters,
  onOpenSummary,
  showTopbar = true,
  flightStart,
  flightEnd,
  onFlightDateChange,
}: Props) {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      {showTopbar && (
        <PlannerTopbar
          resultCount={inventory.length}
          sortOption={sortOption}
          onSortChange={onSortChange}
          currentView={currentView}
          onViewChange={onViewChange}
          activeFilterCount={activeFilterCount}
          onOpenFilters={currentView !== 'ai' ? onOpenFilters : undefined}
          onOpenSummary={onOpenSummary}
          selectedCount={selectedItems.length}
        />
      )}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar">
        {/* Mobile FAB: open Media Plan — top-right of content area, hidden on lg+ */}
        {onOpenSummary && (
          <button
            type="button"
            onClick={onOpenSummary}
            className="lg:hidden absolute top-3 right-3 z-[1100] flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            aria-label="開啟媒體計劃"
          >
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            {selectedItems.length > 0 && (
              <span className="text-sm font-bold leading-none">{selectedItems.length}</span>
            )}
          </button>
        )}
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            onRemove={onRemove}
            objective={objective}
          />
        ) : currentView === 'map' ? (
          <MapWrapper
            inventory={inventory}
            allInventory={allInventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ) : (
          <AiMediaPlannerView
            allInventory={allInventory}
            selectedItems={selectedItems}
            onAdd={onAdd}
            flightStart={flightStart}
            flightEnd={flightEnd}
            onFlightDateChange={onFlightDateChange}
          />
        )}
      </div>
    </div>
  );
}

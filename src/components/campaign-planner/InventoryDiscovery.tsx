'use client';

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
  onAddAll?: () => void;
  onRemove: (inventoryId: string) => void;
  objective?: string;
  activeFilterCount?: number;
  addAllCount?: number;
  onOpenFilters?: () => void;
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
  onAddAll,
  onRemove,
  objective,
  activeFilterCount,
  addAllCount = 0,
  onOpenFilters,
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
          currentView={currentView}
          onViewChange={onViewChange}
          activeFilterCount={activeFilterCount}
          addAllCount={addAllCount}
          onAddAll={currentView !== 'ai' ? onAddAll : undefined}
          onOpenFilters={currentView !== 'ai' ? onOpenFilters : undefined}
        />
      )}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            sortOption={sortOption}
            onSortChange={onSortChange}
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

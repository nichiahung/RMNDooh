'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';

interface Props {
  inventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string;
}

export function InventoryDiscovery({
  inventory,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd,
  objective,
}: Props) {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      <PlannerTopbar
        resultCount={inventory.length}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            objective={objective}
          />
        ) : (
          <MapWrapper
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
          />
        )}
      </div>
    </div>
  );
}

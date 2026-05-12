import React from 'react';
import { SearchAndSortBar } from './SearchAndSortBar';
import { ListView } from './ListView';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { MapPin } from 'lucide-react';

import { MapWrapper } from './MapWrapper';

interface Props {
  inventory: InventoryLocation[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}

export function InventoryDiscovery({
  inventory,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd
}: Props) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      
      {/* Search and Sort Toolbar */}
      <SearchAndSortBar 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
        resultCount={inventory.length}
      />
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView 
            inventory={inventory} 
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
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

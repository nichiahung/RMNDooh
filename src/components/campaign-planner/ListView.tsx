import React from 'react';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';
import { isInMediaPlan } from '@/utils/mediaPlanCalculations';

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}

export function ListView({ inventory, selectedItems, onViewDetails, onAdd }: Props) {
  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">No inventory found</p>
          <p className="text-sm text-slate-500">
            We couldn't find any locations matching your search or filter criteria. Try adjusting your settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {inventory.map((item) => {
          const isSelected = isInMediaPlan(selectedItems, item.id);
          
          return (
            <InventoryCard 
              key={item.id}
              item={item}
              isSelected={isSelected}
              onViewDetails={() => onViewDetails(item)}
              onAdd={() => onAdd(item)}
            />
          );
        })}
      </div>
    </div>
  );
}

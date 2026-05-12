'use client';

import React from 'react';
import { InventoryLocation } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';

interface Props {
  items: InventoryLocation[];
  onItemClick: (item: InventoryLocation) => void;
}

export function ListView({ items, onItemClick }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p className="text-lg font-medium text-slate-700">No inventory found matching your criteria.</p>
        <p className="text-sm mt-1">Try adjusting your filters on the left.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-6">
      {items.map((item) => (
        <InventoryCard 
          key={item.id} 
          item={item} 
          onClick={() => onItemClick(item)} 
        />
      ))}
    </div>
  );
}

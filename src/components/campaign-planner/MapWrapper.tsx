'use client';

import dynamic from 'next/dynamic';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';

// Leaflet depends on `window`, so we must disable SSR
const MapView = dynamic(
  () => import('./MapView').then(mod => mod.MapView),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-slate-100">
        <div className="text-sm text-slate-500 animate-pulse">Loading map...</div>
      </div>
    )
  }
);

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
}

export function MapWrapper({ inventory, selectedItems, onViewDetails }: Props) {
  return (
    <MapView 
      inventory={inventory} 
      selectedItems={selectedItems} 
      onViewDetails={onViewDetails} 
    />
  );
}

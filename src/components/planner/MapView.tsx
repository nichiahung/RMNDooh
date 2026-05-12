'use client';

import React from 'react';
import { InventoryLocation } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import { MapPin } from 'lucide-react';

interface Props {
  items: InventoryLocation[];
  onItemClick: (item: InventoryLocation) => void;
}

export function MapView({ items, onItemClick }: Props) {
  const { selectedItems } = usePlannerStore();

  // For MVP, we use a CSS-positioned mock.
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg font-medium">No locations to map.</p>
      </div>
    );
  }

  const normalize = (val: number, min: number, max: number) => ((val - min) / (max - min)) * 100 || 50;
  
  const minLat = Math.min(...items.map(i => i.latitude));
  const maxLat = Math.max(...items.map(i => i.latitude));
  const minLng = Math.min(...items.map(i => i.longitude));
  const maxLng = Math.max(...items.map(i => i.longitude));

  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.01);
  const lngPadding = Math.max((maxLng - minLng) * 0.2, 0.01);

  const paddedMinLat = minLat - latPadding;
  const paddedMaxLat = maxLat + latPadding;
  const paddedMinLng = minLng - lngPadding;
  const paddedMaxLng = maxLng + lngPadding;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-blue-50 overflow-hidden">
      {/* Mock Map Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <span className="text-4xl font-bold uppercase tracking-widest text-gray-500">Taipei Map Region</span>
      </div>

      {/* Pins */}
      {items.map((item) => {
        const top = 100 - normalize(item.latitude, paddedMinLat, paddedMaxLat);
        const left = normalize(item.longitude, paddedMinLng, paddedMaxLng);
        const isSelected = selectedItems.some(s => s.inventoryId === item.id);

        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className={`absolute z-10 -translate-x-1/2 -translate-y-full transform transition-transform hover:scale-125 focus:outline-none group`}
            style={{ top: `${top}%`, left: `${left}%` }}
            title={item.name}
          >
            <MapPin 
              className={`w-8 h-8 drop-shadow-md transition-colors ${
                isSelected ? 'text-green-500 fill-green-100' : 'text-blue-600 fill-white'
              }`} 
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              {item.name}
              <div className="text-gray-300">${item.cpm.toFixed(2)} CPM</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

'use client';

import React from 'react';
import { InventoryLocation } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import { Plus, Check, MapPin, Users, Monitor, Building } from 'lucide-react';

interface Props {
  item: InventoryLocation;
  onClick?: () => void;
}

export function InventoryCard({ item, onClick }: Props) {
  const { selectedItems, addToMediaPlan, removeFromMediaPlan } = usePlannerStore();
  
  const isSelected = selectedItems.some((selected) => selected.inventoryId === item.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      removeFromMediaPlan(item.id);
    } else {
      addToMediaPlan(item.id, 7);
    }
  };

  return (
    <div 
      className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col group ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onClick}
    >
      <div className="h-44 overflow-hidden relative">
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
        />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 shadow-sm border border-slate-100">
          ${item.cpm.toFixed(2)} <span className="font-medium text-slate-500">CPM</span>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-900 line-clamp-1">{item.name}</h3>
        <p className="text-xs text-slate-500 mt-1 flex items-center">
          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {item.district}, {item.city}
        </p>
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-1 mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center text-xs font-medium text-slate-600">
            <Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {item.screenType}
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600">
            <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {item.venueType}
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 col-span-2">
            <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span className="text-slate-900 font-semibold mr-1">{(item.dailyImpressions / 1000).toFixed(1)}k</span> imp. / day
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="font-bold text-slate-900 text-lg">
            ${item.pricePerDay.toLocaleString()} <span className="text-xs text-slate-500 font-medium">/ day</span>
          </div>
          <button
            onClick={handleToggle}
            className={`p-2 rounded-lg flex items-center justify-center transition-all shadow-sm ${
              isSelected 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            aria-label={isSelected ? "Remove from Plan" : "Add to Plan"}
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

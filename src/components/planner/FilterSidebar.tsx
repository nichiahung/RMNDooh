'use client';

import React from 'react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { VenueType, ScreenType, AudienceTag } from '@/types/inventory';
import { Filter } from 'lucide-react';

const ALL_DISTRICTS = ['Xinyi', 'Zhongzheng', 'Da\'an', 'Wanhua', 'Nangang', 'Songshan', 'Banqiao', 'Neihu', 'Shilin'];
const ALL_VENUE_TYPES: VenueType[] = ['Mall', 'Subway', 'Highway', 'Street', 'Airport', 'Night Market', 'Office Building', 'Station'];
const ALL_SCREEN_TYPES: ScreenType[] = ['Billboard', 'Transit', 'Street Furniture', 'Indoor', 'Kiosk', 'Mega Screen'];
const ALL_AUDIENCE_TAGS: AudienceTag[] = ['Professionals', 'Students', 'Shoppers', 'Tourists', 'Commuters', 'Tech Workers', 'Foodies'];

export function FilterSidebar() {
  const { filters, setFilters } = usePlannerStore();

  const toggleArrayFilter = (field: keyof typeof filters, value: string) => {
    // @ts-ignore
    const currentValues = (filters[field] || []) as string[];
    if (currentValues.includes(value)) {
      setFilters({ [field]: currentValues.filter((v) => v !== value) });
    } else {
      setFilters({ [field]: [...currentValues, value] });
    }
  };

  const clearFilters = () => {
    setFilters({ districts: [], venueTypes: [], screenTypes: [], audienceTags: [] });
  };

  const activeFilterCount = filters.districts.length + filters.venueTypes.length + filters.screenTypes.length + filters.audienceTags.length;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-500" /> Filters
        </h2>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {/* District Filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">District</h3>
          <div className="space-y-2.5">
            {ALL_DISTRICTS.map((district) => (
              <label key={district} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.districts.includes(district)}
                  onChange={() => toggleArrayFilter('districts', district)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{district}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Venue Type Filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Venue Type</h3>
          <div className="space-y-2.5">
            {ALL_VENUE_TYPES.map((venue) => (
              <label key={venue} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.venueTypes.includes(venue)}
                  onChange={() => toggleArrayFilter('venueTypes', venue)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{venue}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Screen Type Filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Screen Type</h3>
          <div className="space-y-2.5">
            {ALL_SCREEN_TYPES.map((screen) => (
              <label key={screen} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.screenTypes.includes(screen)}
                  onChange={() => toggleArrayFilter('screenTypes', screen)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{screen}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Audience Filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Audience</h3>
          <div className="space-y-2.5">
            {ALL_AUDIENCE_TAGS.map((audience) => (
              <label key={audience} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.audienceTags.includes(audience)}
                  onChange={() => toggleArrayFilter('audienceTags', audience)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{audience}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

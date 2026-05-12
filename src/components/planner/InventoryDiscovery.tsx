'use client';

import React, { useState, useMemo } from 'react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { SearchAndSortBar } from './SearchAndSortBar';
import { ListView } from './ListView';
import { MapView } from './MapView';
import { InventoryLocation } from '@/types/inventory';

export function InventoryDiscovery() {
  const { allInventory, filters, viewMode } = usePlannerStore();
  const [sortBy, setSortBy] = useState('impressions_desc');

  // Filtering Logic
  const filteredInventory = useMemo(() => {
    return allInventory.filter((item) => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDistrict = item.district.toLowerCase().includes(query);
        const matchAddress = item.address.toLowerCase().includes(query);
        if (!matchName && !matchDistrict && !matchAddress) return false;
      }

      if (filters.districts.length > 0) {
        if (!filters.districts.includes(item.district)) return false;
      }

      if (filters.venueTypes.length > 0) {
        if (!filters.venueTypes.includes(item.venueType)) return false;
      }

      if (filters.screenTypes.length > 0) {
        if (!filters.screenTypes.includes(item.screenType)) return false;
      }

      if (filters.audienceTags.length > 0) {
        const hasMatch = item.audienceTags.some(aud => filters.audienceTags.includes(aud));
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [allInventory, filters]);

  // Sorting Logic
  const sortedAndFilteredInventory = useMemo(() => {
    return [...filteredInventory].sort((a, b) => {
      switch (sortBy) {
        case 'impressions_desc':
          return b.dailyImpressions - a.dailyImpressions;
        case 'price_asc':
          return a.pricePerDay - b.pricePerDay;
        case 'price_desc':
          return b.pricePerDay - a.pricePerDay;
        case 'cpm_asc':
          return a.cpm - b.cpm;
        default:
          return 0;
      }
    });
  }, [filteredInventory, sortBy]);

  const handleItemClick = (item: InventoryLocation) => {
    console.log('Clicked item:', item);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      <SearchAndSortBar 
        sortBy={sortBy} 
        setSortBy={setSortBy} 
        resultCount={sortedAndFilteredInventory.length} 
      />
      
      <div className="flex-1 overflow-y-auto relative">
        {viewMode === 'list' ? (
          <ListView items={sortedAndFilteredInventory} onItemClick={handleItemClick} />
        ) : (
          <MapView items={sortedAndFilteredInventory} onItemClick={handleItemClick} />
        )}
      </div>
    </div>
  );
}

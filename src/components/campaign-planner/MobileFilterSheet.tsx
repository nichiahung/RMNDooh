'use client';

import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import {
  getAvailableVenueTypes,
  getAvailableScreenTypes,
  getAvailableAudienceTags,
} from '@/utils/inventoryFilters';
import { FilterTab, FilterTabBar } from './MobileFilterSheet/FilterTabBar';
import { FilterTabContent, FilterTabContentHandle } from './MobileFilterSheet/FilterTabContent';

export interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
}: MobileFilterSheetProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const contentRef = useRef<FilterTabContentHandle>(null);

  const allInventory = usePlannerStore((s) => s.allInventory);

  const availableDistricts = useMemo(
    () => [...new Set(allInventory.map((l) => l.district))].sort(),
    [allInventory]
  );
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);

  const tabs: FilterTab[] = [
    { id: 'district',  label: '地區',   activeCount: filters.districts?.length ?? 0 },
    { id: 'venue',     label: '場館類型', activeCount: filters.venueTypes?.length ?? 0 },
    { id: 'screen',    label: '螢幕類型', activeCount: filters.screenTypes?.length ?? 0 },
    { id: 'audience',  label: '受眾標籤', activeCount: filters.audienceTags?.length ?? 0 },
    {
      id: 'budget',
      label: '預算',
      activeCount:
        filters.minBudget !== undefined || filters.maxBudget !== undefined ? 1 : 0,
    },
  ];

  const handleTabChange = (index: number) => {
    setActiveIndex(index);
    contentRef.current?.scrollToTab(index);
  };

  return (
    <>
      {/* Backdrop — tapping dismisses sheet */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '35vh' }}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Tab bar + close button */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex-1 min-w-0">
            <FilterTabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabChange={handleTabChange}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 mr-2 text-slate-400 hover:text-slate-600 flex-shrink-0"
            aria-label="關閉篩選"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll-snap content — fills remaining height */}
        <FilterTabContent
          ref={contentRef}
          filters={filters}
          onFilterChange={onFilterChange}
          availableDistricts={availableDistricts}
          availableVenueTypes={availableVenueTypes}
          availableScreenTypes={availableScreenTypes}
          availableAudienceTags={availableAudienceTags}
          onActiveTabChange={setActiveIndex}
        />

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClearFilters}
            className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 underline"
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            套用篩選
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-white text-indigo-600 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

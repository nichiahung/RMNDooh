'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { FilterState, VenueType, ScreenType, AudienceTag } from '@/types/inventory';

export interface FilterTabContentHandle {
  scrollToTab: (index: number) => void;
}

interface FilterTabContentProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  availableDistricts: string[];
  availableVenueTypes: VenueType[];
  availableScreenTypes: ScreenType[];
  availableAudienceTags: AudienceTag[];
  onActiveTabChange: (index: number) => void;
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border text-xs font-medium px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
        selected
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function ChipGrid<T extends string>({
  items,
  selected,
  onToggle,
}: {
  items: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3 overflow-y-auto h-full content-start">
      {items.map((item) => (
        <ToggleChip
          key={item}
          label={item}
          selected={selected.includes(item)}
          onClick={() => onToggle(item)}
        />
      ))}
    </div>
  );
}

function BudgetPage({
  filters,
  onFilterChange,
}: {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
}) {
  const min = filters.minBudget ?? 0;
  const max = filters.maxBudget ?? 100000;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 mb-1">最低 (NT$)</label>
          <input
            type="number"
            min={0}
            value={min === 0 ? '' : min}
            onChange={(e) =>
              onFilterChange({ minBudget: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0"
          />
        </div>
        <span className="text-slate-400 pb-2">–</span>
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 mb-1">最高 (NT$)</label>
          <input
            type="number"
            min={0}
            value={max === 100000 ? '' : max}
            onChange={(e) =>
              onFilterChange({ maxBudget: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="100000"
          />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100000}
        step={1000}
        value={max}
        onChange={(e) => onFilterChange({ maxBudget: Number(e.target.value) || undefined })}
        className="w-full accent-indigo-600"
      />
      <p className="text-[10px] text-slate-400 text-center">
        NT${min.toLocaleString()} – NT${max.toLocaleString()}
      </p>
    </div>
  );
}

export const FilterTabContent = forwardRef<FilterTabContentHandle, FilterTabContentProps>(
  function FilterTabContent(
    {
      filters,
      onFilterChange,
      availableDistricts,
      availableVenueTypes,
      availableScreenTypes,
      availableAudienceTags,
      onActiveTabChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      scrollToTab(index: number) {
        pageRefs.current[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      },
    }));

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.round(container.scrollLeft / container.clientWidth);
      onActiveTabChange(index);
    };

    function toggleDistrict(d: string) {
      const current = filters.districts ?? [];
      onFilterChange({
        districts: current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
      });
    }

    function toggleVenueType(v: VenueType) {
      const current = filters.venueTypes ?? [];
      onFilterChange({
        venueTypes: current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
      });
    }

    function toggleScreenType(s: ScreenType) {
      const current = filters.screenTypes ?? [];
      onFilterChange({
        screenTypes: current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
      });
    }

    function toggleAudienceTag(a: AudienceTag) {
      const current = filters.audienceTags ?? [];
      onFilterChange({
        audienceTags: current.includes(a) ? current.filter((x) => x !== a) : [...current, a],
      });
    }

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-scroll snap-x snap-mandatory flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Page 0: 地區 */}
        <div
          ref={(el) => { pageRefs.current[0] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableDistricts}
            selected={filters.districts ?? []}
            onToggle={toggleDistrict}
          />
        </div>

        {/* Page 1: 場館類型 */}
        <div
          ref={(el) => { pageRefs.current[1] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableVenueTypes}
            selected={filters.venueTypes ?? []}
            onToggle={toggleVenueType}
          />
        </div>

        {/* Page 2: 螢幕類型 */}
        <div
          ref={(el) => { pageRefs.current[2] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableScreenTypes}
            selected={filters.screenTypes ?? []}
            onToggle={toggleScreenType}
          />
        </div>

        {/* Page 3: 受眾標籤 */}
        <div
          ref={(el) => { pageRefs.current[3] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <ChipGrid
            items={availableAudienceTags}
            selected={filters.audienceTags ?? []}
            onToggle={toggleAudienceTag}
          />
        </div>

        {/* Page 4: 預算 */}
        <div
          ref={(el) => { pageRefs.current[4] = el; }}
          className="flex-none w-full snap-start overflow-y-auto"
        >
          <BudgetPage filters={filters} onFilterChange={onFilterChange} />
        </div>
      </div>
    );
  }
);

'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { AudienceTag, FilterState, ScreenType, VenueType } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import {
  getAvailableVenueTypes,
  getAvailableScreenTypes,
  getAvailableAudienceTags,
} from '@/utils/inventoryFilters';
import { useI18n } from '@/i18n/I18nProvider';
import { AUDIENCE_KEY, CITY_KEY, DISTRICT_KEY, SCREEN_KEY, VENUE_KEY } from '@/i18n/filterLabels';
import {
  addMobileFilterCity,
  clearMobileFilterCityDistricts,
  formatMobileFilterCityRegionSummary,
  formatMobileFilterResultCta,
  getMobileFilterCityRegionGroups,
  getMobileFilterDistrictOptions,
  removeMobileFilterCity,
  selectAllMobileFilterCityDistricts,
} from '@/utils/mobileFilterSheet';

export interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  resultCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  resultCount,
  searchQuery,
  onSearchChange,
}: MobileFilterSheetProps) {
  const { t } = useI18n();
  const allInventory = usePlannerStore((s) => s.allInventory);
  const [collapsedCities, setCollapsedCities] = useState<Set<string>>(new Set());

  const selectedCities = useMemo(
    () => filters.cities ?? (filters.city ? [filters.city] : []),
    [filters.cities, filters.city],
  );
  const cityRegionGroups = useMemo(
    () => getMobileFilterCityRegionGroups(allInventory),
    [allInventory],
  );
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);

  const selectedDistricts = filters.districts ?? [];
  const selectedVenueTypes = filters.venueTypes ?? [];
  const selectedScreenTypes = filters.screenTypes ?? [];
  const selectedAudienceTags = filters.audienceTags ?? [];

  const activeChips = [
    ...(searchQuery.trim()
      ? [{ key: 'search', label: `搜尋：${searchQuery.trim()}`, onRemove: () => onSearchChange('') }]
      : []),
    ...selectedCities.map((value) => ({
      key: `city-${value}`,
      label: t(CITY_KEY[value] ?? value),
      onRemove: () => {
        const nextFilters = removeMobileFilterCity(allInventory, selectedCities, selectedDistricts, value);

        onFilterChange({
          city: undefined,
          cities: nextFilters.cities.length > 0 ? nextFilters.cities : undefined,
          districts: nextFilters.districts,
        });
      },
    })),
    ...selectedDistricts.map((value) => ({
      key: `district-${value}`,
      label: t(DISTRICT_KEY[value] ?? value),
      onRemove: () => onFilterChange({ districts: selectedDistricts.filter((item) => item !== value) }),
    })),
    ...selectedVenueTypes.map((value) => ({
      key: `venue-${value}`,
      label: t(VENUE_KEY[value] ?? value),
      onRemove: () => onFilterChange({ venueTypes: selectedVenueTypes.filter((item) => item !== value) }),
    })),
    ...selectedScreenTypes.map((value) => ({
      key: `screen-${value}`,
      label: t(SCREEN_KEY[value] ?? value),
      onRemove: () => onFilterChange({ screenTypes: selectedScreenTypes.filter((item) => item !== value) }),
    })),
    ...selectedAudienceTags.map((value) => ({
      key: `audience-${value}`,
      label: t(AUDIENCE_KEY[value] ?? value),
      onRemove: () => onFilterChange({ audienceTags: selectedAudienceTags.filter((item) => item !== value) }),
    })),
    ...(
      filters.minBudget !== undefined || filters.maxBudget !== undefined
        ? [{
            key: 'budget',
            label: `預算：NT$${(filters.minBudget ?? 0).toLocaleString()}–NT$${(filters.maxBudget ?? 100000).toLocaleString()}`,
            onRemove: () => onFilterChange({ minBudget: undefined, maxBudget: undefined }),
          }]
        : []
    ),
  ];

  const clearAll = () => {
    onSearchChange('');
    onClearFilters();
  };

  const toggleCity = (value: string) => {
    const nextCities = addMobileFilterCity(selectedCities, value);
    if (nextCities === selectedCities) {
      return;
    }

    const allowedDistricts = new Set(getMobileFilterDistrictOptions(allInventory, nextCities));

    onFilterChange({
      city: undefined,
      cities: nextCities.length > 0 ? nextCities : undefined,
      districts: selectedDistricts.filter((district) => allowedDistricts.has(district)),
    });
  };

  const toggleCityGroup = (city: string) => {
    if (!selectedCities.includes(city)) {
      toggleCity(city);
      setCollapsedCities((prev) => {
        const next = new Set(prev);
        next.delete(city);
        return next;
      });
      return;
    }

    setCollapsedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const selectAllDistrictsInCity = (city: string) => {
    onFilterChange({
      districts: selectAllMobileFilterCityDistricts(allInventory, selectedDistricts, city),
    });
  };

  const clearDistrictsInCity = (city: string) => {
    onFilterChange({
      districts: clearMobileFilterCityDistricts(allInventory, selectedDistricts, city),
    });
  };

  const toggleDistrict = (value: string) => {
    onFilterChange({
      districts: selectedDistricts.includes(value)
        ? selectedDistricts.filter((item) => item !== value)
        : [...selectedDistricts, value],
    });
  };

  const toggleVenueType = (value: VenueType) => {
    onFilterChange({
      venueTypes: selectedVenueTypes.includes(value)
        ? selectedVenueTypes.filter((item) => item !== value)
        : [...selectedVenueTypes, value],
    });
  };

  const toggleScreenType = (value: ScreenType) => {
    onFilterChange({
      screenTypes: selectedScreenTypes.includes(value)
        ? selectedScreenTypes.filter((item) => item !== value)
        : [...selectedScreenTypes, value],
    });
  };

  const toggleAudienceTag = (value: AudienceTag) => {
    onFilterChange({
      audienceTags: selectedAudienceTags.includes(value)
        ? selectedAudienceTags.filter((item) => item !== value)
        : [...selectedAudienceTags, value],
    });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[1190] bg-slate-950/20 transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[1200] flex max-h-[760px] flex-col rounded-t-[20px] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'pointer-events-auto translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        style={{ height: '72dvh' }}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        aria-label="篩選版位"
      >
        <div className="flex flex-shrink-0 flex-col border-b border-slate-100 px-4 pb-3 pt-2">
          <div className="flex justify-center pb-2">
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">篩選版位</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                依地區、預算與受眾縮小可購買版位
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              aria-label="關閉篩選"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="搜尋地點、商圈、場館名稱"
              aria-label="搜尋版位"
            />
          </div>

          {activeChips.length > 0 && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold text-slate-500">已選條件</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  >
                    {chip.label}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <FilterSection title="城市與地區">
            <div className="space-y-3">
              {cityRegionGroups.map((group) => {
                const selected = selectedCities.includes(group.city);
                const collapsed = collapsedCities.has(group.city);
                const selectedDistrictCount = group.districts.filter((district) => (
                  selectedDistricts.includes(district)
                )).length;
                const allDistrictsSelected = selectedDistrictCount === group.districts.length;
                const selectedDistrictLabels = group.districts
                  .filter((district) => selectedDistricts.includes(district))
                  .map((district) => t(DISTRICT_KEY[district] ?? district));
                const summaryText = selected
                  ? formatMobileFilterCityRegionSummary(
                      selectedDistrictCount,
                      group.districts.length,
                      selectedDistrictLabels,
                    )
                  : '點選城市後可設定地區';

                return (
                  <div
                    key={group.city}
                    className={`rounded-2xl border p-3 transition-colors ${
                      selected
                        ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCityGroup(group.city)}
                      aria-pressed={selected}
                      aria-expanded={selected ? !collapsed : undefined}
                      className="flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                    >
                      <span>
                        <span className="block text-sm font-bold text-slate-900">
                          {t(CITY_KEY[group.city] ?? group.city)}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-500">
                          {summaryText}
                        </span>
                      </span>
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-bold ${
                          selected
                            ? 'border-indigo-200 bg-white text-indigo-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {selected ? (
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`}
                            aria-hidden="true"
                          />
                        ) : (
                          '加選'
                        )}
                      </span>
                    </button>

                    {selected && !collapsed && (
                      <div className="mt-3 border-t border-indigo-100 pt-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {group.districts.length} 個可選地區
                          </span>
                          <button
                            type="button"
                            onClick={() => (
                              allDistrictsSelected
                                ? clearDistrictsInCity(group.city)
                                : selectAllDistrictsInCity(group.city)
                            )}
                            className="min-h-9 rounded-full border border-indigo-200 bg-white px-3 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                          >
                            {allDistrictsSelected ? '清除地區' : '全選地區'}
                          </button>
                        </div>
                        <ChipGrid
                          items={group.districts}
                          selectedItems={selectedDistricts}
                          labelFor={(value) => t(DISTRICT_KEY[value] ?? value)}
                          onToggle={toggleDistrict}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title="預算">
            <BudgetFields filters={filters} onFilterChange={onFilterChange} />
          </FilterSection>

          <FilterSection title="受眾">
            <ChipGrid
              items={availableAudienceTags}
              selectedItems={selectedAudienceTags}
              labelFor={(value) => t(AUDIENCE_KEY[value] ?? value)}
              onToggle={toggleAudienceTag}
            />
          </FilterSection>

          <FilterSection title="螢幕類型">
            <ChipGrid
              items={availableScreenTypes}
              selectedItems={selectedScreenTypes}
              labelFor={(value) => t(SCREEN_KEY[value] ?? value)}
              onToggle={toggleScreenType}
            />
          </FilterSection>

          <FilterSection title="場館類型">
            <ChipGrid
              items={availableVenueTypes}
              selectedItems={selectedVenueTypes}
              labelFor={(value) => t(VENUE_KEY[value] ?? value)}
              onToggle={toggleVenueType}
            />
          </FilterSection>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={clearAll}
            className="min-h-11 px-2 text-xs font-semibold text-slate-500 underline transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            {formatMobileFilterResultCta(resultCount)}
          </button>
        </div>
      </div>
    </>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ChipGrid<T extends string>({
  items,
  selectedItems,
  labelFor,
  onToggle,
  selectedIcon = false,
}: {
  items: T[];
  selectedItems: T[];
  labelFor: (value: T) => string;
  onToggle: (value: T) => void;
  selectedIcon?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = selectedItems.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            aria-pressed={selected}
            className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
              selected
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {selectedIcon && selected && <Check className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />}
            {labelFor(item)}
          </button>
        );
      })}
    </div>
  );
}

function BudgetFields({
  filters,
  onFilterChange,
}: {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
      <div>
        <label htmlFor="mobile-filter-budget-min" className="mb-1 block text-[11px] font-medium text-slate-500">
          最低預算
        </label>
        <input
          id="mobile-filter-budget-min"
          type="number"
          min={0}
          value={filters.minBudget ?? ''}
          onChange={(event) => onFilterChange({ minBudget: event.target.value ? Number(event.target.value) : undefined })}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="0"
        />
      </div>
      <span className="pb-3 text-slate-400">-</span>
      <div>
        <label htmlFor="mobile-filter-budget-max" className="mb-1 block text-[11px] font-medium text-slate-500">
          最高預算
        </label>
        <input
          id="mobile-filter-budget-max"
          type="number"
          min={0}
          value={filters.maxBudget ?? ''}
          onChange={(event) => onFilterChange({ maxBudget: event.target.value ? Number(event.target.value) : undefined })}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="100000"
        />
      </div>
    </div>
  );
}

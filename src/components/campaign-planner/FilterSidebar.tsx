'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { getAvailableVenueTypes, getAvailableScreenTypes, getAvailableAudienceTags } from '@/utils/inventoryFilters';
import { useI18n } from '@/i18n/I18nProvider';
import { DISTRICT_KEY, VENUE_KEY, SCREEN_KEY, AUDIENCE_KEY, CITY_KEY, AVAILABILITY_KEY } from '@/i18n/filterLabels';
import { usePlannerStore } from '@/store/usePlannerStore';

const CHIP_LIMIT = 6;

type SectionId = 'objective' | 'location' | 'venueType' | 'screenType' | 'audience' | 'availability' | 'budget';

export interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleChip({
  label,
  selected,
  onClick,
  size = 'md',
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } ${
        selected
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  title,
  collapsed,
  onToggle,
  count,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-900 uppercase tracking-wider hover:text-indigo-700 transition-colors focus:outline-none"
    >
      <span>{title}</span>
      <span className="flex items-center gap-1.5">
        {collapsed && count > 0 && (
          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
            {count}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </span>
    </button>
  );
}

function ChipGroup({
  items,
  selectedItems,
  onToggle,
  labelFn,
  showMoreKey,
  expandedSections,
  onToggleExpand,
  size = 'md',
}: {
  items: string[];
  selectedItems: string[];
  onToggle: (value: string) => void;
  labelFn: (value: string) => string;
  showMoreKey: string;
  expandedSections: Set<string>;
  onToggleExpand: (key: string) => void;
  size?: 'sm' | 'md';
}) {
  const isExpanded = expandedSections.has(showMoreKey);
  const visibleItems = isExpanded ? items : items.slice(0, CHIP_LIMIT);
  const hiddenCount = items.length - CHIP_LIMIT;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map(item => (
        <ToggleChip
          key={item}
          label={labelFn(item)}
          selected={selectedItems.includes(item)}
          onClick={() => onToggle(item)}
          size={size}
        />
      ))}
      {!isExpanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onToggleExpand(showMoreKey)}
          className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-dashed border-indigo-200 rounded-full hover:bg-indigo-50 transition-colors"
        >
          + {hiddenCount} more
        </button>
      )}
      {isExpanded && items.length > CHIP_LIMIT && (
        <button
          type="button"
          onClick={() => onToggleExpand(showMoreKey)}
          className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-dashed border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FilterSidebar({
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
}: FilterSidebarProps) {
  const { t } = useI18n();
  const allInventory = usePlannerStore(s => s.allInventory);

  const [collapsedSections, setCollapsedSections] = useState<Set<SectionId>>(new Set());
  const [expandedChipGroups, setExpandedChipGroups] = useState<Set<string>>(new Set());
  const [collapsedDistrictCities, setCollapsedDistrictCities] = useState<string[]>([]);

  // ── Derived selection arrays ────────────────────────────────────────────────
  const selectedCities = useMemo(
    () => filters.cities ?? (filters.city ? [filters.city] : []),
    [filters.cities, filters.city],
  );
  const selectedObjectives = useMemo(
    () => filters.campaignObjectives ?? (filters.campaignObjective ? [filters.campaignObjective] : []),
    [filters.campaignObjectives, filters.campaignObjective],
  );
  const selectedDistricts = filters.districts ?? [];

  // ── Available options from live inventory ───────────────────────────────────
  const availableCities      = useMemo(() => Array.from(new Set(allInventory.map(i => i.city))).sort(), [allInventory]);
  const availableVenueTypes  = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudience    = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);
  const districtGroups       = useMemo(() => {
    const citiesToShow = selectedCities.length > 0 ? selectedCities : availableCities;
    return citiesToShow
      .map(city => ({
        city,
        districts: Array.from(new Set(allInventory.filter(i => i.city === city).map(i => i.district))).sort(),
      }))
      .filter(g => g.districts.length > 0);
  }, [allInventory, availableCities, selectedCities]);

  // ── Applied filters chip list ───────────────────────────────────────────────
  const appliedChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    selectedObjectives.forEach(o => chips.push({
      label: o,
      onRemove: () => {
        const next = selectedObjectives.filter(x => x !== o);
        onFilterChange({ campaignObjective: undefined, campaignObjectives: next.length ? next : undefined });
      },
    }));
    selectedCities.forEach(city => chips.push({
      label: t(CITY_KEY[city] ?? city),
      onRemove: () => {
        const next = selectedCities.filter(c => c !== city);
        const cityDistricts = new Set(allInventory.filter(i => i.city === city).map(i => i.district));
        onFilterChange({
          city: undefined,
          cities: next.length ? next : undefined,
          districts: selectedDistricts.filter(d => !cityDistricts.has(d)),
        });
      },
    }));
    selectedDistricts.forEach(d => chips.push({
      label: t(DISTRICT_KEY[d] ?? d),
      onRemove: () => onFilterChange({ districts: selectedDistricts.filter(x => x !== d) }),
    }));
    (filters.venueTypes ?? []).forEach(v => chips.push({
      label: t(VENUE_KEY[v] ?? v),
      onRemove: () => onFilterChange({ venueTypes: (filters.venueTypes ?? []).filter(x => x !== v) }),
    }));
    (filters.screenTypes ?? []).forEach(s => chips.push({
      label: t(SCREEN_KEY[s] ?? s),
      onRemove: () => onFilterChange({ screenTypes: (filters.screenTypes ?? []).filter(x => x !== s) }),
    }));
    (filters.audienceTags ?? []).forEach(a => chips.push({
      label: t(AUDIENCE_KEY[a] ?? a),
      onRemove: () => onFilterChange({ audienceTags: (filters.audienceTags ?? []).filter(x => x !== a) }),
    }));
    (filters.availabilityStatus ?? []).forEach(av => chips.push({
      label: t(AVAILABILITY_KEY[av] ?? av),
      onRemove: () => onFilterChange({ availabilityStatus: (filters.availabilityStatus ?? []).filter(x => x !== av) }),
    }));
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      chips.push({
        label: `Budget ${filters.minBudget ?? 0}–${filters.maxBudget ?? '∞'}`,
        onRemove: () => onFilterChange({ minBudget: undefined, maxBudget: undefined }),
      });
    }
    if (filters.minImpressions !== undefined || filters.maxImpressions !== undefined) {
      chips.push({
        label: `Imp ${filters.minImpressions ?? 0}–${filters.maxImpressions ?? '∞'}`,
        onRemove: () => onFilterChange({ minImpressions: undefined, maxImpressions: undefined }),
      });
    }
    return chips;
  }, [filters, selectedCities, selectedDistricts, selectedObjectives, t, onFilterChange, allInventory]);

  // ── Section helpers ─────────────────────────────────────────────────────────
  const toggleSection = (id: SectionId) =>
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleExpand = (key: string) =>
    setExpandedChipGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Filter mutation helpers ─────────────────────────────────────────────────
  const handleArrayToggle = (key: keyof FilterState, value: string) => {
    const current = (filters[key] as string[]) ?? [];
    const next = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
    onFilterChange({ [key]: next.length ? next : undefined });
  };

  const handleCityToggle = (city: string) => {
    const cityDistricts = new Set(allInventory.filter(i => i.city === city).map(i => i.district));
    const isFullySelected = selectedCities.includes(city) && selectedDistricts.every(d => !cityDistricts.has(d));
    const nextCities = isFullySelected
      ? selectedCities.filter(c => c !== city)
      : selectedCities.includes(city) ? selectedCities : [...selectedCities, city];
    onFilterChange({
      city: undefined,
      cities: nextCities.length ? nextCities : undefined,
      districts: selectedDistricts.filter(d => !cityDistricts.has(d)),
    });
  };

  const handleDistrictToggle = (city: string, district: string) => {
    const cityDistricts = Array.from(new Set(allInventory.filter(i => i.city === city).map(i => i.district)));
    const cityDistrictSet = new Set(cityDistricts);
    const otherDistricts = selectedDistricts.filter(d => !cityDistrictSet.has(d));
    const selectedForCity = selectedDistricts.filter(d => cityDistrictSet.has(d));
    const isFullySelected = selectedCities.includes(city) && selectedForCity.length === 0;
    const nextForCity = isFullySelected
      ? [district]
      : selectedForCity.includes(district)
        ? selectedForCity.filter(d => d !== district)
        : [...selectedForCity, district];
    const nowFull = nextForCity.length === cityDistricts.length;
    const nowSelected = nowFull || nextForCity.length > 0;
    onFilterChange({
      city: undefined,
      cities: (nowSelected
        ? selectedCities.includes(city) ? selectedCities : [...selectedCities, city]
        : selectedCities.filter(c => c !== city)
      ).length ? (nowSelected ? selectedCities.includes(city) ? selectedCities : [...selectedCities, city] : selectedCities.filter(c => c !== city)) : undefined,
      districts: (nowFull ? otherDistricts : [...otherDistricts, ...nextForCity]).length
        ? (nowFull ? otherDistricts : [...otherDistricts, ...nextForCity])
        : undefined,
    });
  };

  const getCityState = (city: string, districts: string[]) => {
    const sel = districts.filter(d => selectedDistricts.includes(d));
    if (selectedCities.includes(city) && sel.length === 0) return 'all';
    if (sel.length === districts.length) return 'all';
    if (sel.length > 0) return 'partial';
    return 'none';
  };

  const handleNumberInput = (key: keyof FilterState, value: string) => {
    const num = parseInt(value);
    onFilterChange({ [key]: isNaN(num) ? undefined : num });
  };

  if (!isOpen) return null;

  // ── Objectives label map ────────────────────────────────────────────────────
  const OBJECTIVE_OPTIONS = [
    { value: 'Awareness',         label: t('filter.awareness') },
    { value: 'Store visits',      label: t('filter.storeVisits') },
    { value: 'Product launch',    label: t('filter.productLaunch') },
    { value: 'Event promotion',   label: t('filter.eventPromotion') },
  ];
  const objectiveLabelFn = (v: string) => OBJECTIVE_OPTIONS.find(o => o.value === v)?.label ?? v;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <aside className="flex h-full w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50/80 p-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            {t('filter.searchAndFilter')}
            {activeFilterCount > 0 && (
              <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                {t('filter.clearAll')}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={t('filter.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Applied filters summary */}
        {appliedChips.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-100 flex flex-wrap gap-1.5">
            {appliedChips.map(({ label, onRemove }) => (
              <button
                key={label}
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[11px] font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
              >
                {label}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Search */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder={t('planner.searchPlaceholder')}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 divide-y divide-slate-100 pb-6">

            {/* Objective */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.objective')}
                collapsed={collapsedSections.has('objective')}
                onToggle={() => toggleSection('objective')}
                count={selectedObjectives.length}
              />
              {!collapsedSections.has('objective') && (
                <div className="pt-2">
                  <ChipGroup
                    items={OBJECTIVE_OPTIONS.map(o => o.value)}
                    selectedItems={selectedObjectives}
                    onToggle={val => {
                      const next = selectedObjectives.includes(val)
                        ? selectedObjectives.filter(x => x !== val)
                        : [...selectedObjectives, val];
                      onFilterChange({ campaignObjective: undefined, campaignObjectives: next.length ? next : undefined });
                    }}
                    labelFn={objectiveLabelFn}
                    showMoreKey="objective"
                    expandedSections={expandedChipGroups}
                    onToggleExpand={toggleExpand}
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.location')}
                collapsed={collapsedSections.has('location')}
                onToggle={() => toggleSection('location')}
                count={selectedCities.length + selectedDistricts.length}
              />
              {!collapsedSections.has('location') && (
                <div className="pt-2 space-y-4">
                  {/* City chips */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {t('filter.city')}
                    </p>
                    <ChipGroup
                      items={availableCities}
                      selectedItems={selectedCities}
                      onToggle={handleCityToggle}
                      labelFn={c => t(CITY_KEY[c] ?? c)}
                      showMoreKey="city"
                      expandedSections={expandedChipGroups}
                      onToggleExpand={toggleExpand}
                    />
                  </div>

                  {/* District hierarchy */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {t('filter.district')}
                    </p>
                    {selectedCities.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">{t('filter.selectCityFirst')}</p>
                    ) : (
                      <div className="space-y-2">
                        {districtGroups.map(group => {
                          const state = getCityState(group.city, group.districts);
                          const isCollapsed = collapsedDistrictCities.includes(group.city);
                          const selCount = state === 'all'
                            ? group.districts.length
                            : group.districts.filter(d => selectedDistricts.includes(d)).length;
                          return (
                            <div key={group.city} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCityToggle(group.city)}
                                  className={`min-w-0 flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors focus:outline-none ${
                                    state === 'all'     ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                                    state === 'partial' ? 'bg-amber-50 text-amber-800 border border-amber-200'   :
                                    'text-slate-700 border border-transparent hover:bg-white'
                                  }`}
                                >
                                  <span>{t(CITY_KEY[group.city] ?? group.city)}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    state === 'all'     ? 'bg-indigo-100 text-indigo-700' :
                                    state === 'partial' ? 'bg-amber-100 text-amber-700'   :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {state === 'none' ? 'None' : `${selCount}/${group.districts.length}`}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCollapsedDistrictCities(c =>
                                    c.includes(group.city) ? c.filter(x => x !== group.city) : [...c, group.city]
                                  )}
                                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700 transition-colors focus:outline-none"
                                  aria-expanded={!isCollapsed}
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                </button>
                              </div>
                              {!isCollapsed && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {group.districts.map(district => (
                                    <ToggleChip
                                      key={`${group.city}-${district}`}
                                      label={t(DISTRICT_KEY[district] ?? district)}
                                      selected={state === 'all' || selectedDistricts.includes(district)}
                                      onClick={() => handleDistrictToggle(group.city, district)}
                                      size="sm"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Venue Type */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.venueType')}
                collapsed={collapsedSections.has('venueType')}
                onToggle={() => toggleSection('venueType')}
                count={filters.venueTypes?.length ?? 0}
              />
              {!collapsedSections.has('venueType') && (
                <div className="pt-2">
                  <ChipGroup
                    items={availableVenueTypes}
                    selectedItems={filters.venueTypes ?? []}
                    onToggle={val => handleArrayToggle('venueTypes', val)}
                    labelFn={v => t(VENUE_KEY[v] ?? v)}
                    showMoreKey="venueType"
                    expandedSections={expandedChipGroups}
                    onToggleExpand={toggleExpand}
                  />
                </div>
              )}
            </div>

            {/* Screen Type */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.screenType')}
                collapsed={collapsedSections.has('screenType')}
                onToggle={() => toggleSection('screenType')}
                count={filters.screenTypes?.length ?? 0}
              />
              {!collapsedSections.has('screenType') && (
                <div className="pt-2">
                  <ChipGroup
                    items={availableScreenTypes}
                    selectedItems={filters.screenTypes ?? []}
                    onToggle={val => handleArrayToggle('screenTypes', val)}
                    labelFn={s => t(SCREEN_KEY[s] ?? s)}
                    showMoreKey="screenType"
                    expandedSections={expandedChipGroups}
                    onToggleExpand={toggleExpand}
                  />
                </div>
              )}
            </div>

            {/* Audience */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.audience')}
                collapsed={collapsedSections.has('audience')}
                onToggle={() => toggleSection('audience')}
                count={filters.audienceTags?.length ?? 0}
              />
              {!collapsedSections.has('audience') && (
                <div className="pt-2">
                  <ChipGroup
                    items={availableAudience}
                    selectedItems={filters.audienceTags ?? []}
                    onToggle={val => handleArrayToggle('audienceTags', val)}
                    labelFn={a => t(AUDIENCE_KEY[a] ?? a)}
                    showMoreKey="audience"
                    expandedSections={expandedChipGroups}
                    onToggleExpand={toggleExpand}
                  />
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.availability')}
                collapsed={collapsedSections.has('availability')}
                onToggle={() => toggleSection('availability')}
                count={filters.availabilityStatus?.length ?? 0}
              />
              {!collapsedSections.has('availability') && (
                <div className="pt-2">
                  <ChipGroup
                    items={['Available', 'Limited', 'Unavailable']}
                    selectedItems={filters.availabilityStatus ?? []}
                    onToggle={val => handleArrayToggle('availabilityStatus', val)}
                    labelFn={av => t(AVAILABILITY_KEY[av] ?? av)}
                    showMoreKey="availability"
                    expandedSections={expandedChipGroups}
                    onToggleExpand={toggleExpand}
                  />
                </div>
              )}
            </div>

            {/* Budget & Impressions */}
            <div className="py-3">
              <SectionHeader
                title={t('filter.budget')}
                collapsed={collapsedSections.has('budget')}
                onToggle={() => toggleSection('budget')}
                count={
                  (filters.minBudget !== undefined || filters.maxBudget !== undefined ? 1 : 0) +
                  (filters.minImpressions !== undefined || filters.maxImpressions !== undefined ? 1 : 0)
                }
              />
              {!collapsedSections.has('budget') && (
                <div className="pt-2 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {t('filter.budget')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={t('filter.min')}
                        className="w-full text-sm border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        value={filters.minBudget ?? ''}
                        onChange={e => handleNumberInput('minBudget', e.target.value)}
                      />
                      <span className="text-slate-400 flex-shrink-0">—</span>
                      <input
                        type="number"
                        placeholder={t('filter.max')}
                        className="w-full text-sm border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        value={filters.maxBudget ?? ''}
                        onChange={e => handleNumberInput('maxBudget', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {t('filter.impressions')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={t('filter.min')}
                        className="w-full text-sm border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        value={filters.minImpressions ?? ''}
                        onChange={e => handleNumberInput('minImpressions', e.target.value)}
                      />
                      <span className="text-slate-400 flex-shrink-0">—</span>
                      <input
                        type="number"
                        placeholder={t('filter.max')}
                        className="w-full text-sm border border-slate-200 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        value={filters.maxImpressions ?? ''}
                        onChange={e => handleNumberInput('maxImpressions', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </aside>
  );
}

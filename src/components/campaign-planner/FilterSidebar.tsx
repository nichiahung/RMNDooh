'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { getAvailableVenueTypes, getAvailableScreenTypes, getAvailableAudienceTags } from '@/utils/inventoryFilters';
import { useI18n } from '@/i18n/I18nProvider';
import { DISTRICT_KEY, VENUE_KEY, SCREEN_KEY, AUDIENCE_KEY, CITY_KEY, AVAILABILITY_KEY } from '@/i18n/filterLabels';
import { usePlannerStore } from '@/store/usePlannerStore';

interface Props {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function ToggleChip({
  label,
  selected,
  onClick,
  variant = 'default',
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border ${variant === 'compact' ? 'px-2.5 py-1' : 'px-3 py-1.5'} text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        selected
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterSidebar({ filters, onFilterChange, onClearFilters, activeFilterCount, isOpen, onClose, searchQuery, onSearchChange }: Props) {
  const { t } = useI18n();
  const [collapsedDistrictCities, setCollapsedDistrictCities] = useState<string[]>([]);
  const allInventory = usePlannerStore((s) => s.allInventory);

  const availableCities = useMemo(() => Array.from(new Set(allInventory.map(item => item.city))).sort(), [allInventory]);
  const selectedCities = useMemo(
    () => filters.cities ?? (filters.city ? [filters.city] : []),
    [filters.cities, filters.city]
  );
  const selectedObjectives = useMemo(
    () => filters.campaignObjectives ?? (filters.campaignObjective ? [filters.campaignObjective] : []),
    [filters.campaignObjectives, filters.campaignObjective]
  );
  const districtGroups = useMemo(() => {
    const citiesToShow = selectedCities.length > 0 ? selectedCities : availableCities;
    return citiesToShow
      .map(city => ({
        city,
        districts: Array.from(
          new Set(allInventory.filter(item => item.city === city).map(item => item.district))
        ).sort(),
      }))
      .filter(group => group.districts.length > 0);
  }, [allInventory, availableCities, selectedCities]);
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);
  const selectedDistricts = filters.districts ?? [];

  const handleArrayToggle = (key: keyof FilterState, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    onFilterChange({ [key]: newArray.length > 0 ? newArray : undefined });
  };

  const handleCityToggle = (city: string) => {
    const cityDistricts = new Set(allInventory.filter(item => item.city === city).map(item => item.district));
    const isFullySelected = selectedCities.includes(city) && selectedDistricts.every(district => !cityDistricts.has(district));
    const nextCities = isFullySelected
      ? selectedCities.filter(item => item !== city)
      : selectedCities.includes(city)
        ? selectedCities
        : [...selectedCities, city];
    onFilterChange({
      city: undefined,
      cities: nextCities.length > 0 ? nextCities : undefined,
      districts: selectedDistricts.filter(district => !cityDistricts.has(district)),
    });
  };

  const handleDistrictToggle = (city: string, district: string) => {
    const cityDistricts = Array.from(new Set(allInventory.filter(item => item.city === city).map(item => item.district)));
    const cityDistrictSet = new Set(cityDistricts);
    const otherDistricts = selectedDistricts.filter(item => !cityDistrictSet.has(item));
    const selectedForCity = selectedDistricts.filter(item => cityDistrictSet.has(item));
    const isFullySelected = selectedCities.includes(city) && selectedForCity.length === 0;
    const nextSelectedForCity = isFullySelected
      ? [district]
      : selectedForCity.includes(district)
        ? selectedForCity.filter(item => item !== district)
        : [...selectedForCity, district];
    const cityIsNowFullySelected = nextSelectedForCity.length === cityDistricts.length;
    const cityIsNowSelected = cityIsNowFullySelected || nextSelectedForCity.length > 0;
    const nextCities = cityIsNowSelected
      ? selectedCities.includes(city) ? selectedCities : [...selectedCities, city]
      : selectedCities.filter(item => item !== city);
    const nextDistricts = cityIsNowFullySelected
      ? otherDistricts
      : [...otherDistricts, ...nextSelectedForCity];
    onFilterChange({
      city: undefined,
      cities: nextCities.length > 0 ? nextCities : undefined,
      districts: nextDistricts.length > 0 ? nextDistricts : undefined,
    });
  };

  const handleDistrictCityCollapse = (city: string) => {
    setCollapsedDistrictCities(current =>
      current.includes(city)
        ? current.filter(item => item !== city)
        : [...current, city]
    );
  };

  const getCitySelectionState = (city: string, districts: string[]) => {
    const selectedForCity = districts.filter(district => selectedDistricts.includes(district));
    if (selectedCities.includes(city) && selectedForCity.length === 0) return 'all';
    if (selectedForCity.length === districts.length) return 'all';
    if (selectedForCity.length > 0) return 'partial';
    return 'none';
  };

  const getCitySelectionLabel = (city: string, districts: string[]) => {
    const state = getCitySelectionState(city, districts);
    if (state === 'all') return 'All';
    if (state === 'partial') {
      return `${districts.filter(district => selectedDistricts.includes(district)).length}/${districts.length}`;
    }
    return 'None';
  };

  const getCitySelectionBadgeClass = (city: string, districts: string[]) => {
    const state = getCitySelectionState(city, districts);
    if (state === 'all') return 'bg-indigo-100 text-indigo-700';
    if (state === 'partial') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-500';
  };

  const handleNumberInput = (key: keyof FilterState, value: string) => {
    const num = parseInt(value);
    onFilterChange({ [key]: isNaN(num) ? undefined : num });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50/80 p-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            {t('filter.searchAndFilter')}
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
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
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={t('filter.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              placeholder={t('planner.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Objective */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.objective')}</h3>
            <div className="flex flex-wrap gap-2">
              {[
                ['Awareness', t('filter.awareness')],
                ['Store visits', t('filter.storeVisits')],
                ['Product launch', t('filter.productLaunch')],
                ['Event promotion', t('filter.eventPromotion')],
              ].map(([value, label]) => (
                <ToggleChip
                  key={value}
                  label={label}
                  selected={selectedObjectives.includes(value)}
                  onClick={() => {
                    const nextObjectives = selectedObjectives.includes(value)
                      ? selectedObjectives.filter(item => item !== value)
                      : [...selectedObjectives, value];
                    onFilterChange({
                      campaignObjective: undefined,
                      campaignObjectives: nextObjectives.length > 0 ? nextObjectives : undefined,
                    });
                  }}
                />
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.city')}</h3>
            <div className="flex flex-wrap gap-2">
              {availableCities.map(city => (
                <ToggleChip
                  key={city}
                  label={t(CITY_KEY[city] ?? city)}
                  selected={selectedCities.includes(city)}
                  onClick={() => handleCityToggle(city)}
                />
              ))}
            </div>
          </div>

          {/* District */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">{t('filter.district')}</h3>
              <span className="text-[11px] font-medium text-slate-400">
                {selectedCities.length > 0 ? `${selectedCities.length} ${t('filter.city')}` : t('filter.selectCityFirst')}
              </span>
            </div>
            {selectedCities.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                {t('filter.selectCityFirst')}
              </div>
            )}
            <div className="space-y-2">
              {selectedCities.length > 0 && districtGroups.map(group => {
                const isCollapsed = collapsedDistrictCities.includes(group.city);
                return (
                <div key={group.city} className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCityToggle(group.city)}
                      className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        getCitySelectionState(group.city, group.districts) === 'all'
                          ? 'border-indigo-200 bg-white text-indigo-800'
                          : getCitySelectionState(group.city, group.districts) === 'partial'
                            ? 'border-amber-200 bg-white text-amber-800'
                            : 'border-transparent bg-transparent text-slate-700 hover:bg-white'
                      }`}
                      aria-pressed={getCitySelectionState(group.city, group.districts) !== 'none'}
                      title={getCitySelectionState(group.city, group.districts) === 'all' ? 'Clear city' : 'Select all districts'}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{t(CITY_KEY[group.city] ?? group.city)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getCitySelectionBadgeClass(group.city, group.districts)}`}>
                          {getCitySelectionLabel(group.city, group.districts)}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDistrictCityCollapse(group.city)}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-expanded={!isCollapsed}
                      aria-label={`${t(CITY_KEY[group.city] ?? group.city)} ${collapsedDistrictCities.includes(group.city) ? 'expand' : 'collapse'}`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-wrap gap-2">
                      {group.districts.map(district => (
                        <ToggleChip
                          key={`${group.city}-${district}`}
                          label={t(DISTRICT_KEY[district] ?? district)}
                          selected={getCitySelectionState(group.city, group.districts) === 'all' || selectedDistricts.includes(district)}
                          onClick={() => handleDistrictToggle(group.city, district)}
                          variant="compact"
                        />
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Venue Type */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.venueType')}</h3>
            <div className="flex flex-wrap gap-2">
              {availableVenueTypes.map(venue => (
                <ToggleChip
                  key={venue}
                  label={t(VENUE_KEY[venue] ?? venue)}
                  selected={(filters.venueTypes || []).includes(venue)}
                  onClick={() => handleArrayToggle('venueTypes', venue)}
                />
              ))}
            </div>
          </div>

          {/* Screen Type */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.screenType')}</h3>
            <div className="flex flex-wrap gap-2">
              {availableScreenTypes.map(screen => (
                <ToggleChip
                  key={screen}
                  label={t(SCREEN_KEY[screen] ?? screen)}
                  selected={(filters.screenTypes || []).includes(screen)}
                  onClick={() => handleArrayToggle('screenTypes', screen)}
                />
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.audience')}</h3>
            <div className="flex flex-wrap gap-2">
              {availableAudienceTags.map(audience => (
                <ToggleChip
                  key={audience}
                  label={t(AUDIENCE_KEY[audience] ?? audience)}
                  selected={(filters.audienceTags || []).includes(audience)}
                  onClick={() => handleArrayToggle('audienceTags', audience)}
                />
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.availability')}</h3>
            <div className="flex flex-wrap gap-2">
              {(['Available', 'Limited', 'Unavailable'] as const).map(status => (
                <ToggleChip
                  key={status}
                  label={t(AVAILABILITY_KEY[status])}
                  selected={(filters.availabilityStatus || []).includes(status)}
                  onClick={() => handleArrayToggle('availabilityStatus', status)}
                />
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.budget')}</h3>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder={t('filter.min')}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.minBudget || ''}
                onChange={(e) => handleNumberInput('minBudget', e.target.value)} />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder={t('filter.max')}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.maxBudget || ''}
                onChange={(e) => handleNumberInput('maxBudget', e.target.value)} />
            </div>
          </div>

          {/* Impressions Range */}
          <div className="pb-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.impressions')}</h3>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder={t('filter.min')}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.minImpressions || ''}
                onChange={(e) => handleNumberInput('minImpressions', e.target.value)} />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder={t('filter.max')}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.maxImpressions || ''}
                onChange={(e) => handleNumberInput('maxImpressions', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

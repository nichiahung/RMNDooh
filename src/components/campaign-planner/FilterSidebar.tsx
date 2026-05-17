'use client';

import { useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { getAvailableDistricts, getAvailableVenueTypes, getAvailableScreenTypes, getAvailableAudienceTags } from '@/utils/inventoryFilters';
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

export function FilterSidebar({ filters, onFilterChange, onClearFilters, activeFilterCount, isOpen, onClose, searchQuery, onSearchChange }: Props) {
  const { t } = useI18n();
  const allInventory = usePlannerStore((s) => s.allInventory);

  const availableCities = useMemo(() => Array.from(new Set(allInventory.map(item => item.city))).sort(), [allInventory]);
  const availableDistricts = useMemo(() => getAvailableDistricts(allInventory), [allInventory]);
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(allInventory), [allInventory]);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(allInventory), [allInventory]);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(allInventory), [allInventory]);
  const selectedCities = filters.cities ?? (filters.city ? [filters.city] : []);
  const selectedObjectives = filters.campaignObjectives ?? (filters.campaignObjective ? [filters.campaignObjective] : []);

  const handleArrayToggle = (key: keyof FilterState, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    onFilterChange({ [key]: newArray.length > 0 ? newArray : undefined });
  };

  const handleCityToggle = (city: string) => {
    const nextCities = selectedCities.includes(city)
      ? selectedCities.filter(item => item !== city)
      : [...selectedCities, city];
    const allowedDistricts = new Set(
      allInventory
        .filter(item => nextCities.length === 0 || nextCities.includes(item.city))
        .map(item => item.district)
    );
    onFilterChange({
      city: undefined,
      cities: nextCities.length > 0 ? nextCities : undefined,
      districts: (filters.districts ?? []).filter(district => allowedDistricts.has(district)),
    });
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
            <div className="space-y-2 pl-1">
              {[
                ['Awareness', t('filter.awareness')],
                ['Store visits', t('filter.storeVisits')],
                ['Product launch', t('filter.productLaunch')],
                ['Event promotion', t('filter.eventPromotion')],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={selectedObjectives.includes(value)}
                    onChange={() => {
                      const nextObjectives = selectedObjectives.includes(value)
                        ? selectedObjectives.filter(item => item !== value)
                        : [...selectedObjectives, value];
                      onFilterChange({
                        campaignObjective: undefined,
                        campaignObjectives: nextObjectives.length > 0 ? nextObjectives : undefined,
                      });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.city')}</h3>
            <div className="space-y-2 pl-1">
              {availableCities.map(city => (
                <label key={city} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={selectedCities.includes(city)}
                    onChange={() => handleCityToggle(city)}
                  />
                  {t(CITY_KEY[city] ?? city)}
                </label>
              ))}
            </div>
          </div>

          {/* District */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.district')}</h3>
            <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
              {availableDistricts
                .filter(d => selectedCities.length === 0 || selectedCities.includes(allInventory.find(i => i.district === d)?.city ?? ''))
                .map(district => (
                  <label key={district} className="flex items-center text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={(filters.districts || []).includes(district)}
                      onChange={() => handleArrayToggle('districts', district)} />
                    {t(DISTRICT_KEY[district] ?? district)}
                  </label>
                ))}
            </div>
          </div>

          {/* Venue Type */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.venueType')}</h3>
            <div className="space-y-2 pl-1">
              {availableVenueTypes.map(venue => (
                <label key={venue} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={(filters.venueTypes || []).includes(venue)}
                    onChange={() => handleArrayToggle('venueTypes', venue)} />
                  {t(VENUE_KEY[venue] ?? venue)}
                </label>
              ))}
            </div>
          </div>

          {/* Screen Type */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.screenType')}</h3>
            <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
              {availableScreenTypes.map(screen => (
                <label key={screen} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={(filters.screenTypes || []).includes(screen)}
                    onChange={() => handleArrayToggle('screenTypes', screen)} />
                  {t(SCREEN_KEY[screen] ?? screen)}
                </label>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.audience')}</h3>
            <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
              {availableAudienceTags.map(audience => (
                <label key={audience} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={(filters.audienceTags || []).includes(audience)}
                    onChange={() => handleArrayToggle('audienceTags', audience)} />
                  {t(AUDIENCE_KEY[audience] ?? audience)}
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.availability')}</h3>
            <div className="space-y-2 pl-1">
              {(['Available', 'Limited', 'Unavailable'] as const).map(status => (
                <label key={status} className="flex items-center text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={(filters.availabilityStatus || []).includes(status)}
                    onChange={() => handleArrayToggle('availabilityStatus', status)} />
                  {t(AVAILABILITY_KEY[status])}
                </label>
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

'use client';

import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { FilterState } from '@/types/inventory';
import { mockInventory } from '@/lib/mockData';
import { getAvailableDistricts, getAvailableVenueTypes, getAvailableScreenTypes, getAvailableAudienceTags } from '@/utils/inventoryFilters';
import { useI18n } from '@/i18n/I18nProvider';
import { DISTRICT_KEY, VENUE_KEY, SCREEN_KEY, AUDIENCE_KEY, CITY_KEY, AVAILABILITY_KEY } from '@/i18n/filterLabels';

interface Props {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function FilterSidebar({ filters, onFilterChange, onClearFilters, activeFilterCount }: Props) {
  const { t } = useI18n();
  
  // Dynamically generate options from inventory
  const availableDistricts = useMemo(() => getAvailableDistricts(mockInventory), []);
  const availableVenueTypes = useMemo(() => getAvailableVenueTypes(mockInventory), []);
  const availableScreenTypes = useMemo(() => getAvailableScreenTypes(mockInventory), []);
  const availableAudienceTags = useMemo(() => getAvailableAudienceTags(mockInventory), []);

  const handleArrayToggle = (key: keyof FilterState, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    onFilterChange({ [key]: newArray.length > 0 ? newArray : undefined });
  };

  const handleNumberInput = (key: keyof FilterState, value: string) => {
    const num = parseInt(value);
    onFilterChange({ [key]: isNaN(num) ? undefined : num });
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-500" /> 
          {t('filter.title')}
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </h2>
        {activeFilterCount > 0 && (
          <button 
            onClick={onClearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            {t('filter.clearAll')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Objective */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.objective')}</h3>
          <select 
            className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
            value={filters.campaignObjective || ''}
            onChange={(e) => onFilterChange({ campaignObjective: e.target.value || undefined })}
          >
            <option value="">{t('filter.anyObjective')}</option>
            <option value="Awareness">{t('filter.awareness')}</option>
            <option value="Store visits">{t('filter.storeVisits')}</option>
            <option value="Product launch">{t('filter.productLaunch')}</option>
            <option value="Event promotion">{t('filter.eventPromotion')}</option>
          </select>
        </div>

        {/* City */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.city')}</h3>
          <select 
            className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 mb-2"
            value={filters.city || ''}
            onChange={(e) => onFilterChange({ city: e.target.value || undefined, districts: [] })} // Reset district if city changes
          >
            <option value="">{t('filter.anyCity')}</option>
            <option value="Taipei">{t(CITY_KEY['Taipei'])}</option>
            <option value="New Taipei">{t(CITY_KEY['New Taipei'])}</option>
          </select>
        </div>

        {/* District */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.district')}</h3>
          <div className="space-y-2 mt-2 pl-1 max-h-40 overflow-y-auto custom-scrollbar">
            {availableDistricts
              .filter(d => !filters.city || mockInventory.find(i => i.district === d)?.city === filters.city)
              .map(district => (
              <label key={district} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.districts || []).includes(district)}
                  onChange={() => handleArrayToggle('districts', district)}
                /> 
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
                <input
                  type="checkbox"
                  className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.venueTypes || []).includes(venue)}
                  onChange={() => handleArrayToggle('venueTypes', venue)}
                />
                {t(VENUE_KEY[venue] ?? venue)}
              </label>
            ))}
          </div>
        </div>

        {/* Screen Type */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.screenType')}</h3>
          <div className="space-y-2 pl-1 max-h-40 overflow-y-auto custom-scrollbar">
            {availableScreenTypes.map(screen => (
              <label key={screen} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.screenTypes || []).includes(screen)}
                  onChange={() => handleArrayToggle('screenTypes', screen)}
                />
                {t(SCREEN_KEY[screen] ?? screen)}
              </label>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.audience')}</h3>
          <div className="space-y-2 pl-1 max-h-40 overflow-y-auto custom-scrollbar">
            {availableAudienceTags.map(audience => (
              <label key={audience} className="flex items-center text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.audienceTags || []).includes(audience)}
                  onChange={() => handleArrayToggle('audienceTags', audience)}
                />
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
                <input
                  type="checkbox"
                  className="mr-2 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={(filters.availabilityStatus || []).includes(status)}
                  onChange={() => handleArrayToggle('availabilityStatus', status)}
                />
                {t(AVAILABILITY_KEY[status])}
              </label>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.budget')}</h3>
          <div className="flex items-center space-x-2">
            <input 
              type="number" 
              placeholder="Min" 
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500" 
              value={filters.minBudget || ''}
              onChange={(e) => handleNumberInput('minBudget', e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500" 
              value={filters.maxBudget || ''}
              onChange={(e) => handleNumberInput('maxBudget', e.target.value)}
            />
          </div>
        </div>

        {/* Impressions Range */}
        <div className="pb-4">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.impressions')}</h3>
          <div className="flex items-center space-x-2">
            <input 
              type="number" 
              placeholder="Min" 
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500" 
              value={filters.minImpressions || ''}
              onChange={(e) => handleNumberInput('minImpressions', e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="w-full text-sm border-slate-300 rounded-md shadow-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500" 
              value={filters.maxImpressions || ''}
              onChange={(e) => handleNumberInput('maxImpressions', e.target.value)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

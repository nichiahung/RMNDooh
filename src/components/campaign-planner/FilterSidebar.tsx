'use client';

import { useState, useMemo } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  // Mobile drawer props (from main)
  isOpen: boolean;
  onClose: () => void;
  // Search props (from feature branch)
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FilterSidebar({ filters, onFilterChange, onClearFilters, activeFilterCount, isOpen, onClose, searchQuery, onSearchChange }: Props) {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // ── Collapsed state (desktop only) ──────────────────────────────────
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex w-10 bg-white border-r border-slate-200 flex-col items-center py-3 gap-3 flex-shrink-0 z-20 transition-all duration-200">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
          title={t('filter.searchAndFilter')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-50 text-slate-500">
            <Filter className="w-4 h-4" />
          </div>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
      </aside>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-200 lg:transform-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
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
            {/* Mobile close */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Desktop collapse */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex w-6 h-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
              title={t('filter.collapse')}
            >
              <ChevronLeft className="w-4 h-4" />
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
              className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
              value={filters.city || ''}
              onChange={(e) => onFilterChange({ city: e.target.value || undefined, districts: [] })}
            >
              <option value="">{t('filter.anyCity')}</option>
              <option value="Taipei">{t(CITY_KEY['Taipei'])}</option>
              <option value="New Taipei">{t(CITY_KEY['New Taipei'])}</option>
            </select>
          </div>

          {/* District */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">{t('filter.district')}</h3>
            <div className="space-y-2 pl-1 max-h-36 overflow-y-auto custom-scrollbar">
              {availableDistricts
                .filter(d => !filters.city || mockInventory.find(i => i.district === d)?.city === filters.city)
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
      </aside>
    </>
  );
}

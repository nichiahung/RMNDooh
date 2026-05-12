'use client';

import { usePlannerStore } from '@/store/usePlannerStore';
import { VenueType, ScreenType, AudienceTag } from '@/types/inventory';
import { Filter } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

const ALL_DISTRICTS = ['Xinyi', "Zhongzheng", "Da'an", 'Wanhua', 'Nangang', 'Songshan', 'Banqiao', 'Neihu', 'Shilin'];
const ALL_VENUE_TYPES: VenueType[] = ['Mall', 'Subway', 'Highway', 'Street', 'Airport', 'Night Market', 'Office Building', 'Station'];
const ALL_SCREEN_TYPES: ScreenType[] = ['Billboard', 'Transit', 'Street Furniture', 'Indoor', 'Kiosk', 'Mega Screen'];
const ALL_AUDIENCE_TAGS: AudienceTag[] = ['Professionals', 'Students', 'Shoppers', 'Tourists', 'Commuters', 'Tech Workers', 'Foodies'];

const DISTRICT_KEY: Record<string, string> = {
  'Xinyi': 'filter.district.Xinyi',
  'Zhongzheng': 'filter.district.Zhongzheng',
  "Da'an": 'filter.district.Daan',
  'Wanhua': 'filter.district.Wanhua',
  'Nangang': 'filter.district.Nangang',
  'Songshan': 'filter.district.Songshan',
  'Banqiao': 'filter.district.Banqiao',
  'Neihu': 'filter.district.Neihu',
  'Shilin': 'filter.district.Shilin',
};

const VENUE_KEY: Record<string, string> = {
  'Mall': 'filter.venue.Mall',
  'Subway': 'filter.venue.Subway',
  'Highway': 'filter.venue.Highway',
  'Street': 'filter.venue.Street',
  'Airport': 'filter.venue.Airport',
  'Night Market': 'filter.venue.NightMarket',
  'Office Building': 'filter.venue.OfficeBuilding',
  'Station': 'filter.venue.Station',
};

const SCREEN_KEY: Record<string, string> = {
  'Billboard': 'filter.screen.Billboard',
  'Transit': 'filter.screen.Transit',
  'Street Furniture': 'filter.screen.StreetFurniture',
  'Indoor': 'filter.screen.Indoor',
  'Kiosk': 'filter.screen.Kiosk',
  'Mega Screen': 'filter.screen.MegaScreen',
};

const AUDIENCE_KEY: Record<string, string> = {
  'Professionals': 'filter.audience.Professionals',
  'Students': 'filter.audience.Students',
  'Shoppers': 'filter.audience.Shoppers',
  'Tourists': 'filter.audience.Tourists',
  'Commuters': 'filter.audience.Commuters',
  'Tech Workers': 'filter.audience.TechWorkers',
  'Foodies': 'filter.audience.Foodies',
};

export function FilterSidebar() {
  const { filters, setFilters } = usePlannerStore();
  const { t } = useI18n();

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

  const activeFilterCount = (filters.districts?.length || 0) + (filters.venueTypes?.length || 0) + (filters.screenTypes?.length || 0) + (filters.audienceTags?.length || 0);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-500" /> {t('filter.title')}
        </h2>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            {t('filter.clearAll')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">

        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('filter.district')}</h3>
          <div className="space-y-2.5">
            {ALL_DISTRICTS.map((district) => (
              <label key={district} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.districts?.includes(district) ?? false}
                  onChange={() => toggleArrayFilter('districts', district)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  {t(DISTRICT_KEY[district] ?? district)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('filter.venueType')}</h3>
          <div className="space-y-2.5">
            {ALL_VENUE_TYPES.map((venue) => (
              <label key={venue} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.venueTypes?.includes(venue) ?? false}
                  onChange={() => toggleArrayFilter('venueTypes', venue)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  {t(VENUE_KEY[venue] ?? venue)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('filter.screenType')}</h3>
          <div className="space-y-2.5">
            {ALL_SCREEN_TYPES.map((screen) => (
              <label key={screen} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.screenTypes?.includes(screen) ?? false}
                  onChange={() => toggleArrayFilter('screenTypes', screen)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  {t(SCREEN_KEY[screen] ?? screen)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">{t('filter.audience')}</h3>
          <div className="space-y-2.5">
            {ALL_AUDIENCE_TAGS.map((audience) => (
              <label key={audience} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-colors"
                  checked={filters.audienceTags?.includes(audience) ?? false}
                  onChange={() => toggleArrayFilter('audienceTags', audience)}
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  {t(AUDIENCE_KEY[audience] ?? audience)}
                </span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}

// Shared lookup maps: English value → i18n key
// Used by FilterSidebar and InventoryCard to translate option labels.

export const DISTRICT_KEY: Record<string, string> = {
  'Xinyi':       'filter.district.Xinyi',
  'Zhongzheng':  'filter.district.Zhongzheng',
  "Da'an":       'filter.district.Daan',
  'Wanhua':      'filter.district.Wanhua',
  'Nangang':     'filter.district.Nangang',
  'Songshan':    'filter.district.Songshan',
  'Banqiao':     'filter.district.Banqiao',
  'Neihu':       'filter.district.Neihu',
  'Shilin':      'filter.district.Shilin',
};

export const VENUE_KEY: Record<string, string> = {
  'Mall':            'filter.venue.Mall',
  'Subway':          'filter.venue.Subway',
  'Highway':         'filter.venue.Highway',
  'Street':          'filter.venue.Street',
  'Airport':         'filter.venue.Airport',
  'Night Market':    'filter.venue.NightMarket',
  'Office Building': 'filter.venue.OfficeBuilding',
  'Station':         'filter.venue.Station',
};

export const SCREEN_KEY: Record<string, string> = {
  'Billboard':       'filter.screen.Billboard',
  'Transit':         'filter.screen.Transit',
  'Street Furniture':'filter.screen.StreetFurniture',
  'Indoor':          'filter.screen.Indoor',
  'Kiosk':           'filter.screen.Kiosk',
  'Mega Screen':     'filter.screen.MegaScreen',
};

export const AUDIENCE_KEY: Record<string, string> = {
  'Professionals': 'filter.audience.Professionals',
  'Students':      'filter.audience.Students',
  'Shoppers':      'filter.audience.Shoppers',
  'Tourists':      'filter.audience.Tourists',
  'Commuters':     'filter.audience.Commuters',
  'Tech Workers':  'filter.audience.TechWorkers',
  'Foodies':       'filter.audience.Foodies',
};

export const CITY_KEY: Record<string, string> = {
  'Taipei':     'filter.city.Taipei',
  'New Taipei': 'filter.city.NewTaipei',
};

export const AVAILABILITY_KEY: Record<string, string> = {
  'Available':   'filter.available',
  'Limited':     'filter.limited',
  'Unavailable': 'filter.unavailable',
};

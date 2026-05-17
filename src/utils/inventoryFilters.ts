import { InventoryLocation, FilterState, VenueType, ScreenType, AudienceTag } from '../types/inventory';

/**
 * Filter the inventory based on the provided FilterState.
 * If a filter array is empty or undefined, it is ignored.
 */
export function filterInventory(inventory: InventoryLocation[], filters: FilterState): InventoryLocation[] {
  return inventory.filter((item) => {
    // 1. Filter by city
    const selectedCities = filters.cities && filters.cities.length > 0
      ? filters.cities
      : filters.city
        ? [filters.city]
        : [];
    if (selectedCities.length > 0 && !selectedCities.includes(item.city)) {
      return false;
    }

    // 2. Filter by district
    if (filters.districts && filters.districts.length > 0) {
      if (!filters.districts.includes(item.district)) return false;
    }

    // 3. Filter by venueType
    if (filters.venueTypes && filters.venueTypes.length > 0) {
      if (!filters.venueTypes.includes(item.venueType)) return false;
    }

    // 4. Filter by screenType
    if (filters.screenTypes && filters.screenTypes.length > 0) {
      if (!filters.screenTypes.includes(item.screenType)) return false;
    }

    // 5. Filter by audienceTags (must include at least one selected tag)
    if (filters.audienceTags && filters.audienceTags.length > 0) {
      const hasMatch = item.audienceTags.some((tag) => filters.audienceTags!.includes(tag));
      if (!hasMatch) return false;
    }

    // 6. Filter by minBudget and maxBudget (based on pricePerDay)
    if (filters.minBudget !== undefined && item.pricePerDay < filters.minBudget) return false;
    if (filters.maxBudget !== undefined && item.pricePerDay > filters.maxBudget) return false;

    // 7. Filter by minImpressions and maxImpressions
    if (filters.minImpressions !== undefined && item.dailyImpressions < filters.minImpressions) return false;
    if (filters.maxImpressions !== undefined && item.dailyImpressions > filters.maxImpressions) return false;

    // 8. Filter by availability (Available >= 0.7, Limited >= 0.3, Unavailable < 0.3)
    if (filters.availabilityStatus && filters.availabilityStatus.length > 0) {
      let status = 'Unavailable';
      if (item.availability >= 0.7) status = 'Available';
      else if (item.availability >= 0.3) status = 'Limited';
      
      if (!filters.availabilityStatus.includes(status)) return false;
    }

    return true;
  });
}

/**
 * Search inventory by name, district, or address (case-insensitive)
 */
export function searchInventory(inventory: InventoryLocation[], searchQuery: string): InventoryLocation[] {
  if (!searchQuery) return inventory;
  
  const query = searchQuery.toLowerCase();
  return inventory.filter((item) => {
    return (
      item.name.toLowerCase().includes(query) ||
      item.district.toLowerCase().includes(query) ||
      item.address.toLowerCase().includes(query)
    );
  });
}

/**
 * Sort the inventory based on a specific string key
 */
export function sortInventory(inventory: InventoryLocation[], sortOption: string): InventoryLocation[] {
  // Create a copy of the array to keep the function pure
  return [...inventory].sort((a, b) => {
    switch (sortOption) {
      case 'impressions_desc':
        return b.dailyImpressions - a.dailyImpressions;
      case 'impressions_asc':
        return a.dailyImpressions - b.dailyImpressions;
      case 'price_desc':
        return b.pricePerDay - a.pricePerDay;
      case 'price_asc':
        return a.pricePerDay - b.pricePerDay;
      case 'cpm_desc':
        return b.cpm - a.cpm;
      case 'cpm_asc':
        return a.cpm - b.cpm;
      default:
        return 0; // Default: no sorting
    }
  });
}

/**
 * Extract all unique districts available in the inventory
 */
export function getAvailableDistricts(inventory: InventoryLocation[]): string[] {
  const districts = new Set(inventory.map(item => item.district));
  return Array.from(districts).sort();
}

/**
 * Extract all unique venue types available in the inventory
 */
export function getAvailableVenueTypes(inventory: InventoryLocation[]): VenueType[] {
  const venues = new Set(inventory.map(item => item.venueType));
  return Array.from(venues).sort() as VenueType[];
}

/**
 * Extract all unique screen types available in the inventory
 */
export function getAvailableScreenTypes(inventory: InventoryLocation[]): ScreenType[] {
  const screens = new Set(inventory.map(item => item.screenType));
  return Array.from(screens).sort() as ScreenType[];
}

/**
 * Extract all unique audience tags available in the inventory
 */
export function getAvailableAudienceTags(inventory: InventoryLocation[]): AudienceTag[] {
  const audiences = new Set<AudienceTag>();
  inventory.forEach(item => {
    item.audienceTags.forEach(tag => audiences.add(tag));
  });
  return Array.from(audiences).sort();
}

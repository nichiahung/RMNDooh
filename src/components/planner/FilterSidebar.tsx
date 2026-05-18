'use client';

import { useMemo, useState } from 'react';
import { usePlannerStore } from '@/store/usePlannerStore';
import { FilterSidebar as BaseFilterSidebar } from '@/components/campaign-planner/FilterSidebar';

export function FilterSidebar() {
  const { filters, setFilters, allInventory } = usePlannerStore();
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const activeFilterCount = useMemo(() =>
    (filters.districts?.length ?? 0) +
    (filters.venueTypes?.length ?? 0) +
    (filters.screenTypes?.length ?? 0) +
    (filters.audienceTags?.length ?? 0) +
    (filters.cities?.length ?? 0) +
    (filters.campaignObjectives?.length ?? 0) +
    (filters.availabilityStatus?.length ?? 0) +
    (filters.minBudget !== undefined || filters.maxBudget !== undefined ? 1 : 0) +
    (filters.minImpressions !== undefined || filters.maxImpressions !== undefined ? 1 : 0),
    [filters],
  );

  return (
    <BaseFilterSidebar
      filters={filters}
      onFilterChange={partial => setFilters(partial)}
      onClearFilters={() => setFilters({ districts: [], venueTypes: [], screenTypes: [], audienceTags: [], cities: [], campaignObjectives: [] })}
      activeFilterCount={activeFilterCount}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      searchQuery={searchQuery}
      onSearchChange={q => {
        setSearchQuery(q);
        setFilters({ searchQuery: q });
      }}
    />
  );
}

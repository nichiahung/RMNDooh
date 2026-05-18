export function formatMobileFilterResultCta(resultCount: number) {
  return `查看 ${resultCount} 個版位`;
}

export function formatMobileFilterCityRegionSummary(
  selectedCount: number,
  totalCount: number,
  selectedRegionLabels: string[],
) {
  if (selectedCount === 0) {
    return '未限定地區';
  }

  if (selectedCount === totalCount) {
    return `已全選 ${totalCount} 個地區`;
  }

  const visibleLabels = selectedRegionLabels.slice(0, 2).join('、');
  const remainingCount = Math.max(selectedCount - 2, 0);
  const remainingText = remainingCount > 0 ? ` +${remainingCount}` : '';

  return `已選 ${selectedCount}/${totalCount}：${visibleLabels}${remainingText}`;
}

export function getMobileFilterDistrictOptions(
  inventory: Array<{ city: string; district: string }>,
  selectedCities: string[],
) {
  if (selectedCities.length === 0) {
    return [];
  }

  const allowedCities = new Set(selectedCities);
  return Array.from(
    new Set(
      inventory
        .filter((location) => allowedCities.has(location.city))
        .map((location) => location.district),
    ),
  ).sort();
}

export function addMobileFilterCity(selectedCities: string[], city: string) {
  return selectedCities.includes(city) ? selectedCities : [...selectedCities, city];
}

export function removeMobileFilterCity(
  inventory: Array<{ city: string; district: string }>,
  selectedCities: string[],
  selectedDistricts: string[],
  cityToRemove: string,
) {
  const nextCities = selectedCities.filter((city) => city !== cityToRemove);
  const removedCityDistricts = new Set(
    inventory.filter((location) => location.city === cityToRemove).map((location) => location.district),
  );

  return {
    cities: nextCities,
    districts: selectedDistricts.filter((district) => !removedCityDistricts.has(district)),
  };
}

export function selectAllMobileFilterCityDistricts(
  inventory: Array<{ city: string; district: string }>,
  selectedDistricts: string[],
  city: string,
) {
  const cityDistricts = inventory
    .filter((location) => location.city === city)
    .map((location) => location.district)
    .sort();

  return Array.from(new Set([...selectedDistricts, ...cityDistricts]));
}

export function clearMobileFilterCityDistricts(
  inventory: Array<{ city: string; district: string }>,
  selectedDistricts: string[],
  city: string,
) {
  const cityDistricts = new Set(
    inventory.filter((location) => location.city === city).map((location) => location.district),
  );

  return selectedDistricts.filter((district) => !cityDistricts.has(district));
}

export function getMobileFilterDistrictGroups(
  inventory: Array<{ city: string; district: string }>,
  selectedCities: string[],
) {
  if (selectedCities.length === 0) {
    return [];
  }

  const cities = selectedCities;

  return cities
    .map((city) => ({
      city,
      districts: Array.from(
        new Set(
          inventory
            .filter((location) => location.city === city)
            .map((location) => location.district),
        ),
      ).sort(),
    }))
    .filter((group) => group.districts.length > 0);
}

export function getMobileFilterCityRegionGroups(inventory: Array<{ city: string; district: string }>) {
  const cities = Array.from(new Set(inventory.map((location) => location.city))).sort();

  return cities
    .map((city) => ({
      city,
      districts: Array.from(
        new Set(
          inventory
            .filter((location) => location.city === city)
            .map((location) => location.district),
        ),
      ).sort(),
    }))
    .filter((group) => group.districts.length > 0);
}

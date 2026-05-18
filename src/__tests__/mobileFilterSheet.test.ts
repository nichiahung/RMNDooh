import { describe, expect, it } from 'vitest';
import {
  addMobileFilterCity,
  clearMobileFilterCityDistricts,
  formatMobileFilterCityRegionSummary,
  formatMobileFilterResultCta,
  getMobileFilterDistrictOptions,
  getMobileFilterCityRegionGroups,
  getMobileFilterDistrictGroups,
  removeMobileFilterCity,
  selectAllMobileFilterCityDistricts,
} from '@/utils/mobileFilterSheet';

describe('formatMobileFilterResultCta', () => {
  it('formats the mobile filter primary action around matching inventory count', () => {
    expect(formatMobileFilterResultCta(0)).toBe('查看 0 個版位');
    expect(formatMobileFilterResultCta(8)).toBe('查看 8 個版位');
  });
});

describe('getMobileFilterDistrictOptions', () => {
  it('limits district options to selected cities before sorting', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'New Taipei', district: 'Banqiao' },
      { city: 'Taoyuan', district: 'Zhongli' },
      { city: 'Taoyuan', district: 'Dayuan' },
    ];

    expect(getMobileFilterDistrictOptions(inventory, ['Taoyuan'])).toEqual(['Dayuan', 'Zhongli']);
  });

  it('does not expose district options before a city is selected', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'New Taipei', district: 'Banqiao' },
    ];

    expect(getMobileFilterDistrictOptions(inventory, [])).toEqual([]);
  });
});

describe('addMobileFilterCity', () => {
  it('adds an unselected city without removing existing city selections', () => {
    expect(addMobileFilterCity(['Taipei'], 'Taoyuan')).toEqual(['Taipei', 'Taoyuan']);
  });

  it('keeps an already-selected city selected when tapped again', () => {
    expect(addMobileFilterCity(['Taipei', 'Taoyuan'], 'Taipei')).toEqual(['Taipei', 'Taoyuan']);
  });
});

describe('removeMobileFilterCity', () => {
  it('removes the city and only the districts that belong to that city', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'Taipei', district: 'DaAn' },
      { city: 'Taoyuan', district: 'Zhongli' },
      { city: 'Taoyuan', district: 'Dayuan' },
    ];

    expect(
      removeMobileFilterCity(
        inventory,
        ['Taipei', 'Taoyuan'],
        ['Xinyi', 'Zhongli', 'Dayuan'],
        'Taoyuan',
      ),
    ).toEqual({
      cities: ['Taipei'],
      districts: ['Xinyi'],
    });
  });
});

describe('selectAllMobileFilterCityDistricts', () => {
  it('selects every district in a city while preserving districts from other cities', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'Taipei', district: 'DaAn' },
      { city: 'Taoyuan', district: 'Dayuan' },
    ];

    expect(selectAllMobileFilterCityDistricts(inventory, ['Dayuan'], 'Taipei')).toEqual([
      'Dayuan',
      'DaAn',
      'Xinyi',
    ]);
  });
});

describe('clearMobileFilterCityDistricts', () => {
  it('clears only the districts that belong to one city', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'Taipei', district: 'DaAn' },
      { city: 'Taoyuan', district: 'Dayuan' },
    ];

    expect(clearMobileFilterCityDistricts(inventory, ['Xinyi', 'DaAn', 'Dayuan'], 'Taipei')).toEqual([
      'Dayuan',
    ]);
  });
});

describe('getMobileFilterDistrictGroups', () => {
  it('groups districts by selected cities in the selected city order', () => {
    const inventory = [
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'Taoyuan', district: 'Zhongli' },
      { city: 'Taoyuan', district: 'Dayuan' },
      { city: 'Taipei', district: 'DaAn' },
    ];

    expect(getMobileFilterDistrictGroups(inventory, ['Taoyuan', 'Taipei'])).toEqual([
      { city: 'Taoyuan', districts: ['Dayuan', 'Zhongli'] },
      { city: 'Taipei', districts: ['DaAn', 'Xinyi'] },
    ]);
  });

  it('does not group districts before a city is selected', () => {
    const inventory = [
      { city: 'Taoyuan', district: 'Zhongli' },
      { city: 'Taipei', district: 'Xinyi' },
    ];

    expect(getMobileFilterDistrictGroups(inventory, [])).toEqual([]);
  });
});

describe('getMobileFilterCityRegionGroups', () => {
  it('builds city groups with sorted districts for grouped filter UI', () => {
    const inventory = [
      { city: 'Taoyuan', district: 'Zhongli' },
      { city: 'Taipei', district: 'Xinyi' },
      { city: 'Taoyuan', district: 'Dayuan' },
      { city: 'Taipei', district: 'DaAn' },
    ];

    expect(getMobileFilterCityRegionGroups(inventory)).toEqual([
      { city: 'Taipei', districts: ['DaAn', 'Xinyi'] },
      { city: 'Taoyuan', districts: ['Dayuan', 'Zhongli'] },
    ]);
  });
});

describe('formatMobileFilterCityRegionSummary', () => {
  it('shows whole-city targeting before region narrowing', () => {
    expect(formatMobileFilterCityRegionSummary(0, 4, [])).toBe('未限定地區');
  });

  it('shows selected region names for partial selection', () => {
    expect(formatMobileFilterCityRegionSummary(2, 4, ['信義區', '大安區'])).toBe(
      '已選 2/4：信義區、大安區',
    );
  });

  it('limits long selected region summaries', () => {
    expect(formatMobileFilterCityRegionSummary(3, 5, ['信義區', '大安區', '中山區'])).toBe(
      '已選 3/5：信義區、大安區 +1',
    );
  });

  it('shows all selected state when every region is selected', () => {
    expect(formatMobileFilterCityRegionSummary(4, 4, ['信義區', '大安區'])).toBe('已全選 4 個地區');
  });
});

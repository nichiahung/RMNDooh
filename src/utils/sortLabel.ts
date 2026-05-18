const COMPACT: Record<string, string> = {
  impressions_desc: '觸及人次↓',
  impressions_asc:  '觸及人次↑',
  price_desc:       '日費用↓',
  price_asc:        '日費用↑',
  cpm_desc:         'CPM↓',
  cpm_asc:          'CPM↑',
};

export function getSortLabelCompact(sortOption: string): string {
  return COMPACT[sortOption] ?? sortOption;
}

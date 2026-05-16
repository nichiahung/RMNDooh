import type { InventoryLocation } from '@/types/inventory';

export function queryInventory(query: string, inventory: InventoryLocation[]): InventoryLocation[] {
  const q = query.toLowerCase();
  let filtered = [...inventory];

  // City filter — 新北 checked before 台北 because '新北' contains '北',
  // so a 新北 query must not fall through to the 台北 branch.
  // Each branch matches both Chinese and English city strings stored in mockData.
  if (q.includes('新北')) filtered = filtered.filter(i => i.city === '新北市' || i.city === 'New Taipei');
  else if (q.includes('桃園')) filtered = filtered.filter(i => i.city === '桃園市' || i.city === 'Taoyuan');
  else if (q.includes('台北')) filtered = filtered.filter(i => i.city === '台北市' || i.city === 'Taipei');

  // Audience filters
  if (q.includes('通勤')) filtered = filtered.filter(i => i.audienceTags.includes('Commuters'));
  if (q.includes('上班')) filtered = filtered.filter(i => i.audienceTags.includes('Professionals'));
  if (q.includes('學生')) filtered = filtered.filter(i => i.audienceTags.includes('Students'));
  if (q.includes('購物') || q.includes('消費')) filtered = filtered.filter(i => i.audienceTags.includes('Shoppers'));
  if (q.includes('科技')) filtered = filtered.filter(i => i.audienceTags.includes('Tech Workers'));
  if (q.includes('旅客') || q.includes('觀光')) filtered = filtered.filter(i => i.audienceTags.includes('Tourists'));

  // Venue type filters
  if (q.includes('捷運') || q.includes('站')) {
    filtered = filtered.filter(i => i.venueType === 'Station' || i.venueType === 'Subway');
  }
  if (q.includes('機場')) filtered = filtered.filter(i => i.venueType === 'Airport');
  if (q.includes('看板')) filtered = filtered.filter(i => i.screenType === 'Billboard');

  // Budget filter — extract first integer ≥ 100
  const budgetMatch = q.match(/(\d[\d,]*)/g);
  if (budgetMatch) {
    for (const m of budgetMatch) {
      const n = parseInt(m.replace(/,/g, ''), 10);
      if (n >= 100) {
        filtered = filtered.filter(i => i.pricePerDay <= n);
        break;
      }
    }
  }

  // Fallback: if nothing remains after filtering, use full inventory
  if (filtered.length === 0) filtered = [...inventory];

  return filtered
    .sort((a, b) => b.dna.baseMatchScore - a.dna.baseMatchScore)
    .slice(0, 3);
}

export function buildResponseText(venues: InventoryLocation[], _query: string): string {
  const capped = venues.slice(0, 3); // defensive cap — markers array only has 3 entries
  if (capped.length === 0) {
    return '找不到符合條件的版位，試試調整預算或地區範圍。';
  }
  const markers = ['①', '②', '③'];
  const lines = capped.map((v, i) => {
    const marker = markers[i] ?? `(${i + 1})`;
    const tags = v.audienceTags.slice(0, 2).join(' ');
    return `${marker} ${v.name}\n   NT$${v.pricePerDay.toLocaleString()}/天 · ${v.dailyImpressions.toLocaleString()} 日曝光 · ${tags}`;
  });
  return `根據你的目標，我找到 ${capped.length} 個適合的版位：\n\n${lines.join('\n\n')}`;
}

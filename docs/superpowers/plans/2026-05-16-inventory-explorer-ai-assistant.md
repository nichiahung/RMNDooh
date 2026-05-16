# Inventory Explorer + AI Planning Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive map preview on the workspace home page with an immersive inventory explorer (filters, 4-state pins, slide-in detail panel) and a floating mock AI chat that recommends venues from natural-language goals.

**Architecture:** Six files are added/modified in dependency order: `mockAI.ts` (pure logic, testable), `campaign-draft.ts` (adds `inventoryIds` to summaries), `VenueDetailPanel.tsx` (pure UI), `InventoryExplorer.tsx` (Leaflet map + filters + panel), `AIAssistant.tsx` (floating chat), `WorkspacePage.tsx` (wires everything). `InventoryMapPreview.tsx` is deleted.

**Tech Stack:** React, Next.js App Router, Leaflet (dynamic import), Tailwind CSS, Vitest for tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/mockAI.ts` | Create | Parse query text → filter inventory → return top 3; build response string |
| `src/__tests__/mockAI.test.ts` | Create | Unit tests for `queryInventory` and `buildResponseText` |
| `src/lib/api/campaign-draft.ts` | Modify (line ~389) | Add `inventoryIds: string[]` to `listCampaignSummaries` return |
| `src/components/workspace/VenueDetailPanel.tsx` | Create | Slide-in venue detail panel (pure React, no Leaflet) |
| `src/components/workspace/InventoryExplorer.tsx` | Create | Leaflet map + city/type filters + 4-state pins + VenueDetailPanel |
| `src/components/workspace/AIAssistant.tsx` | Create | Floating FAB + chat panel |
| `src/components/workspace/WorkspacePage.tsx` | Modify | Swap InventoryMapPreview → InventoryExplorer, add AIAssistant, derive usedInventoryIds |
| `src/components/workspace/InventoryMapPreview.tsx` | Delete | Superseded by InventoryExplorer |

---

## Task 1: Mock AI Logic

**Files:**
- Create: `src/lib/mockAI.ts`
- Create: `src/__tests__/mockAI.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/mockAI.test.ts
import { describe, it, expect } from 'vitest';
import { queryInventory, buildResponseText } from '@/lib/mockAI';
import { mockInventory } from '@/lib/mockData';

describe('queryInventory', () => {
  it('filters by city 台北', () => {
    const results = queryInventory('台北', mockInventory);
    results.forEach(r => expect(r.city).toBe('台北市'));
  });

  it('filters by city 新北', () => {
    const results = queryInventory('新北', mockInventory);
    results.forEach(r => expect(r.city).toBe('新北市'));
  });

  it('filters by city 桃園', () => {
    const results = queryInventory('桃園', mockInventory);
    results.forEach(r => expect(r.city).toBe('桃園市'));
  });

  it('filters by audience 通勤', () => {
    const results = queryInventory('通勤', mockInventory);
    results.forEach(r => expect(r.audienceTags).toContain('Commuters'));
  });

  it('filters by budget number', () => {
    const results = queryInventory('預算3000以下', mockInventory);
    results.forEach(r => expect(r.pricePerDay).toBeLessThanOrEqual(3000));
  });

  it('returns top 3 max', () => {
    const results = queryInventory('台北通勤族', mockInventory);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns top 3 by baseMatchScore when no filters match anything', () => {
    const results = queryInventory('zzz_nomatch', mockInventory);
    expect(results.length).toBe(3);
    expect(results[0].dna.baseMatchScore).toBeGreaterThanOrEqual(results[1].dna.baseMatchScore);
  });

  it('combines city + audience filters', () => {
    const results = queryInventory('台北上班族', mockInventory);
    results.forEach(r => {
      expect(r.city).toBe('台北市');
      expect(r.audienceTags).toContain('Professionals');
    });
  });
});

describe('buildResponseText', () => {
  it('returns 找不到 message when venues is empty', () => {
    const text = buildResponseText([], '台北');
    expect(text).toContain('找不到');
  });

  it('includes venue name and price for each result', () => {
    const venues = mockInventory.slice(0, 2);
    const text = buildResponseText(venues, '台北');
    expect(text).toContain(venues[0].name);
    expect(text).toContain(venues[1].name);
    expect(text).toContain('根據你的目標');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/mockAI.test.ts 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '@/lib/mockAI'"

- [ ] **Step 3: Create `src/lib/mockAI.ts`**

```ts
import type { InventoryLocation } from '@/types/inventory';

export function queryInventory(query: string, inventory: InventoryLocation[]): InventoryLocation[] {
  const q = query.toLowerCase();
  let filtered = [...inventory];

  // City filter — 新北 checked before 台北 to avoid substring collision
  if (q.includes('新北')) filtered = filtered.filter(i => i.city === '新北市');
  else if (q.includes('桃園')) filtered = filtered.filter(i => i.city === '桃園市');
  else if (q.includes('台北')) filtered = filtered.filter(i => i.city === '台北市');

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
  if (venues.length === 0) {
    return '找不到符合條件的版位，試試調整預算或地區範圍。';
  }
  const markers = ['①', '②', '③'];
  const lines = venues.map((v, i) => {
    const tags = v.audienceTags.slice(0, 2).join(' ');
    return `${markers[i]} ${v.name}\n   NT$${v.pricePerDay.toLocaleString()}/天 · ${v.dailyImpressions.toLocaleString()} 日曝光 · ${tags}`;
  });
  return `根據你的目標，我找到 ${venues.length} 個適合的版位：\n\n${lines.join('\n\n')}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mockAI.test.ts 2>&1 | tail -20
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockAI.ts src/__tests__/mockAI.test.ts
git commit -m "feat: add mockAI query engine with vitest coverage"
```

---

## Task 2: Add `inventoryIds` to Campaign Summaries

**Files:**
- Modify: `src/lib/api/campaign-draft.ts` (function `listCampaignSummaries`, around line 383–396)

- [ ] **Step 1: Locate the return block in `listCampaignSummaries`**

Find this block in `src/lib/api/campaign-draft.ts`:

```ts
    return {
      ...c,
      inventoryCount: items.length,
      uploadedCount,
      totalCount: reqs.length,
    };
```

- [ ] **Step 2: Add `inventoryIds`**

Replace that block with:

```ts
    return {
      ...c,
      inventoryIds: items.map(item => item.inventoryLocationId),
      inventoryCount: items.length,
      uploadedCount,
      totalCount: reqs.length,
    };
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "tradingIterationActions"
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/campaign-draft.ts
git commit -m "feat: include inventoryIds in listCampaignSummaries return"
```

---

## Task 3: VenueDetailPanel Component

**Files:**
- Create: `src/components/workspace/VenueDetailPanel.tsx`

- [ ] **Step 1: Create `src/components/workspace/VenueDetailPanel.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { X, MapPin, TrendingUp, Clock, Star } from 'lucide-react';
import type { InventoryLocation } from '@/types/inventory';

interface VenueDetailPanelProps {
  venue: InventoryLocation | null;
  isUsed: boolean;
  onClose: () => void;
}

function availabilityLabel(a: number): { label: string; color: string } {
  if (a >= 0.7) return { label: '可用', color: '#6366f1' };
  if (a >= 0.3) return { label: '有限', color: '#f59e0b' };
  return { label: '不可用', color: '#94a3b8' };
}

function topPeakHours(peakHours: number[]): string {
  const indexed = peakHours.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  return indexed
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map(({ i }) => `${String(i).padStart(2, '0')}:00`)
    .join(' · ');
}

export function VenueDetailPanel({ venue, isUsed, onClose }: VenueDetailPanelProps) {
  const router = useRouter();

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-xl z-[1000] flex flex-col transition-transform duration-150 ease-out"
      style={{ transform: venue ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {venue && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-slate-100">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">{venue.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{venue.district}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{venue.screenType}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Availability */}
            <div>
              {(() => {
                const { label, color } = availabilityLabel(venue.availability);
                return (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm text-slate-700">{label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${venue.availability * 100}%`, background: color }} />
                    </div>
                    <span className="text-xs text-slate-400">{Math.round(venue.availability * 100)}%</span>
                  </div>
                );
              })()}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">日費用</div>
                <div className="text-sm font-semibold text-slate-800">NT${venue.pricePerDay.toLocaleString()}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">日曝光</div>
                <div className="text-sm font-semibold text-slate-800">
                  {venue.dailyImpressions >= 10000
                    ? `${(venue.dailyImpressions / 10000).toFixed(0)}萬`
                    : venue.dailyImpressions.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-0.5">CPM</div>
                <div className="text-sm font-semibold text-slate-800">NT${venue.cpm.toFixed(0)}</div>
              </div>
            </div>

            {/* Audience tags */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 受眾特徵
              </div>
              <div className="flex flex-wrap gap-1.5">
                {venue.audienceTags.map(tag => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            {/* Peak hours */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>尖峰時段 {topPeakHours(venue.dna.peakHours)}</span>
            </div>

            {/* Used badge */}
            {isUsed && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                已使用於過去活動
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed">{venue.description}</p>
          </div>

          {/* CTA */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => router.push(`/campaign-planner?inventoryId=${venue.id}`)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              開始規劃此版位 <span>→</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "tradingIterationActions"
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/VenueDetailPanel.tsx
git commit -m "feat: add VenueDetailPanel slide-in component"
```

---

## Task 4: InventoryExplorer Component

**Files:**
- Create: `src/components/workspace/InventoryExplorer.tsx`

- [ ] **Step 1: Create `src/components/workspace/InventoryExplorer.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import type { InventoryLocation } from '@/types/inventory';
import { VenueDetailPanel } from './VenueDetailPanel';

interface InventoryExplorerProps {
  inventory: InventoryLocation[];
  usedInventoryIds: Set<string>;
}

type CityFilter = '全部' | '台北' | '新北' | '桃園';
type TypeFilter = '全部' | '捷運站' | '看板' | '商場' | '機場';

const CITY_MAP: Record<string, string> = { '台北': '台北市', '新北': '新北市', '桃園': '桃園市' };

function matchesTypeFilter(item: InventoryLocation, f: TypeFilter): boolean {
  if (f === '全部') return true;
  if (f === '捷運站') return item.venueType === 'Station' || item.venueType === 'Subway';
  if (f === '看板') return item.screenType === 'Billboard' || item.venueType === 'Highway' || item.venueType === 'Street';
  if (f === '商場') return item.venueType === 'Mall';
  if (f === '機場') return item.venueType === 'Airport';
  return true;
}

function getPinStyle(item: InventoryLocation, usedIds: Set<string>) {
  if (usedIds.has(item.id)) return { color: '#10b981', size: 16, star: true };
  if (item.availability >= 0.7) return { color: '#6366f1', size: 12, star: false };
  if (item.availability >= 0.3) return { color: '#f59e0b', size: 12, star: false };
  return { color: '#94a3b8', size: 12, star: false };
}

export function InventoryExplorer({ inventory, usedInventoryIds }: InventoryExplorerProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerLayerRef = useRef<unknown>(null);
  const selectVenueRef = useRef<(v: InventoryLocation) => void>(() => {});

  const [cityFilter, setCityFilter] = useState<CityFilter>('全部');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('全部');
  const [selectedVenue, setSelectedVenue] = useState<InventoryLocation | null>(null);

  // Keep ref in sync so marker click handlers always see latest setter
  useEffect(() => { selectVenueRef.current = setSelectedVenue; }, []);

  const displayed = useMemo(() => {
    return inventory.filter(item => {
      if (cityFilter !== '全部' && item.city !== CITY_MAP[cityFilter]) return false;
      if (!matchesTypeFilter(item, typeFilter)) return false;
      return true;
    });
  }, [inventory, cityFilter, typeFilter]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      if (!mapRef.current || mapInstanceRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(mapRef.current!, {
        center: [24.98, 121.38],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    });
    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
      }
    };
  }, []);

  // Re-render markers whenever displayed list or usedInventoryIds changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current) return;
    import('leaflet').then(L => {
      if (!markerLayerRef.current) return;
      (markerLayerRef.current as any).clearLayers();
      displayed.forEach(item => {
        const { color, size, star } = getPinStyle(item, usedInventoryIds);
        const half = size / 2;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${size * 0.55}px;color:white;line-height:1">${star ? '★' : ''}</div>`,
          iconSize: [size, size],
          iconAnchor: [half, half],
        });
        const marker = L.marker([item.latitude, item.longitude], { icon });
        marker.on('click', () => selectVenueRef.current(item));
        (markerLayerRef.current as any).addLayer(marker);
      });
    });
  }, [displayed, usedInventoryIds]);

  const cityTabs: CityFilter[] = ['全部', '台北', '新北', '桃園'];
  const typeFilters: TypeFilter[] = ['全部', '捷運站', '看板', '商場', '機場'];

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* City tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {cityTabs.map(c => (
            <button
              key={c}
              onClick={() => setCityFilter(c)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                cityFilter === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {/* Type pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeFilters.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 500 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-3 text-xs text-slate-600 z-[500]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />可用</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />有限</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />不可用</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />已使用</span>
        </div>

        {/* Count badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm border border-slate-100 text-xs text-slate-600 font-medium z-[500]">
          {cityFilter === '全部' ? '' : cityFilter + ' '}{displayed.length} 個版位
        </div>

        {/* CTA */}
        <div className="absolute top-4 right-4 z-[500]">
          <button
            onClick={() => router.push('/campaign-planner')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-colors"
          >
            + 開始規劃
          </button>
        </div>

        {/* Detail panel */}
        <VenueDetailPanel
          venue={selectedVenue}
          isUsed={selectedVenue ? usedInventoryIds.has(selectedVenue.id) : false}
          onClose={() => setSelectedVenue(null)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "tradingIterationActions"
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/InventoryExplorer.tsx
git commit -m "feat: add InventoryExplorer with filters, 4-state pins, and detail panel"
```

---

## Task 5: AIAssistant Floating Chat

**Files:**
- Create: `src/components/workspace/AIAssistant.tsx`

- [ ] **Step 1: Create `src/components/workspace/AIAssistant.tsx`**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Minus, Send, Sparkles } from 'lucide-react';
import type { InventoryLocation } from '@/types/inventory';
import { queryInventory, buildResponseText } from '@/lib/mockAI';

interface Message {
  role: 'user' | 'ai';
  text: string;
  venues?: InventoryLocation[];
}

interface AIAssistantProps {
  inventory: InventoryLocation[];
}

function streamText(
  fullText: string,
  onChunk: (partial: string) => void,
  onDone: () => void,
) {
  let i = 0;
  function next() {
    if (i >= fullText.length) { onDone(); return; }
    onChunk(fullText.slice(0, i + 1));
    i++;
    setTimeout(next, 18);
  }
  next();
}

const WELCOME = '告訴我你的廣告目標，我來推薦最適合的版位。\n\n例如：「台北通勤族，預算每天5000以下」';

export function AIAssistant({ inventory }: AIAssistantProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleOpen() {
    setIsOpen(true);
    setPulseActive(false);
  }

  function handleSubmit() {
    const userText = input.trim();
    if (!userText || isStreaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);

    const venues = queryInventory(userText, inventory);
    const fullText = buildResponseText(venues, userText);

    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'ai', text: '' }]);

    streamText(
      fullText,
      partial => setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], text: partial };
        return next;
      }),
      () => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], venues };
          return next;
        });
        setIsStreaming(false);
      },
    );
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
      >
        <Sparkles className={`w-4 h-4 ${pulseActive ? 'animate-pulse' : ''}`} />
        AI 規劃
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-800">AI 規劃助手</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                    {msg.role === 'ai' && isStreaming && idx === messages.length - 1 && (
                      <span className="inline-block w-1 h-3.5 bg-slate-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>

                  {/* Venue cards after streaming completes */}
                  {msg.venues && msg.venues.length > 0 && (
                    <div className="space-y-2">
                      {msg.venues.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{v.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                NT${v.pricePerDay.toLocaleString()}/天 · {v.district}
                              </p>
                            </div>
                            <button
                              onClick={() => router.push(`/campaign-planner?inventoryId=${v.id}`)}
                              className="flex-shrink-0 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              規劃
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="描述你的廣告目標..."
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                onClick={handleSubmit}
                disabled={isStreaming || !input.trim()}
                className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "tradingIterationActions"
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/AIAssistant.tsx
git commit -m "feat: add AIAssistant floating chat with mock streaming"
```

---

## Task 6: Wire WorkspacePage + Delete Old Component

**Files:**
- Modify: `src/components/workspace/WorkspacePage.tsx`
- Delete: `src/components/workspace/InventoryMapPreview.tsx`

- [ ] **Step 1: Replace WorkspacePage.tsx**

Replace the entire contents of `src/components/workspace/WorkspacePage.tsx` with:

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, ShoppingCart, Loader2, ChevronRight, CheckCircle2, Clock, LogOut, MapPin } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { mockInventory } from '@/lib/mockData';
import type { Proposal } from '@/types/trading-models';

const InventoryExplorer = dynamic(
  () => import('./InventoryExplorer').then(m => m.InventoryExplorer),
  { ssr: false, loading: () => <div className="rounded-2xl bg-slate-100 animate-pulse" style={{ height: 500 }} /> },
);

const AIAssistant = dynamic(
  () => import('./AIAssistant').then(m => m.AIAssistant),
  { ssr: false },
);

export function WorkspacePage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const role = currentUser?.role ?? 'advertiser';
  const [drafts, setDrafts] = useState<Awaited<ReturnType<typeof listCampaignSummaries>>>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listCampaignSummaries(),
      listAdminProposalsApi().then(res => res.proposals),
    ]).then(([d, p]) => {
      setDrafts(d);
      setProposals(p);
      setIsLoading(false);
    });
  }, []);

  const usedInventoryIds = useMemo(() => {
    const ids = new Set<string>();
    drafts.forEach(draft => {
      (draft as any).inventoryIds?.forEach((id: string) => ids.add(id));
    });
    return ids;
  }, [drafts]);

  const showSelfService = role === 'advertiser' || role === 'admin';
  const showProposals = role === 'sales' || role === 'admin';
  const showExplorer = role === 'advertiser' || role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/drmn-logo.png" alt="DRMN" height={28} width={100} className="object-contain" />
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                進入管理後台
              </Link>
            )}
            <span className="text-sm text-slate-500">{currentUser?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 登出
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-12">
        {/* Inventory Explorer */}
        {showExplorer && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-500" />
                  探索版位
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">台北・新北・桃園 共 {mockInventory.length} 個點位</p>
              </div>
            </div>
            <InventoryExplorer
              inventory={mockInventory}
              usedInventoryIds={usedInventoryIds}
            />
          </section>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {showSelfService && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      自助購買 (Self-Service)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">規劃、選點、上傳素材並直接下單</p>
                  </div>
                  <button
                    onClick={() => router.push('/campaign-planner')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 新增活動
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drafts.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">目前沒有任何活動草稿。</p>
                    </div>
                  ) : (
                    drafts.map(draft => (
                      <button
                        key={draft.id}
                        onClick={() => router.push(`/campaign-planner?id=${draft.id}`)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-800 text-lg">{draft.name}</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                              {draft.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <span>{draft.inventoryCount} 個版位</span>
                            <span className="flex items-center gap-1">
                              {draft.uploadedCount === draft.totalCount && draft.totalCount > 0
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                              素材 {draft.uploadedCount}/{draft.totalCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium text-indigo-600">
                          繼續規劃 <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            {showProposals && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-500" />
                      專案提案 (Sales Proposals)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">為客戶量身打造的報價與版位提案</p>
                  </div>
                  <button
                    onClick={() => router.push('/proposal-builder')}
                    className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 建立提案
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proposals.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">目前沒有任何提案。</p>
                    </div>
                  ) : (
                    proposals.map(proposal => (
                      <button
                        key={proposal.id}
                        onClick={() => router.push(`/proposal-builder?proposalId=${proposal.id}`)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-800 text-lg">{proposal.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              proposal.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              proposal.status.includes('approved') ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {proposal.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <span>總價: {proposal.finalQuote ? `NT$${proposal.finalQuote.toLocaleString()}` : '未定'}</span>
                            <span>{proposal.requestedDays ?? '未知'} 天走期</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium text-emerald-600">
                          檢視提案 <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* AI Assistant — only for advertiser/admin */}
      {showExplorer && <AIAssistant inventory={mockInventory} />}
    </div>
  );
}
```

- [ ] **Step 2: Delete the old InventoryMapPreview**

```bash
rm src/components/workspace/InventoryMapPreview.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "tradingIterationActions"
```

Expected: no new errors

- [ ] **Step 4: Run all tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass (including the new mockAI tests from Task 1)

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/WorkspacePage.tsx
git rm src/components/workspace/InventoryMapPreview.tsx
git commit -m "feat: wire InventoryExplorer and AIAssistant into WorkspacePage"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Map height 500px, scroll-wheel enabled | Task 4 |
| City tabs + venue type pills filter | Task 4 |
| Count badge updates on filter | Task 4 |
| 4-state pins (indigo/amber/slate/emerald) | Task 4 |
| Emerald pins 16px with ★ for used venues | Task 4 |
| `usedInventoryIds` derived from drafts | Task 2 + Task 6 |
| Legend gains 已使用 item | Task 4 |
| Detail panel slides in from right, 320px | Task 3 |
| Panel: availability bar, stats, tags, peak hours | Task 3 |
| Panel: 已使用 badge conditional | Task 3 |
| Panel: CTA → `/campaign-planner?inventoryId=` | Task 3 |
| Pins don't use Leaflet popups | Task 4 |
| Floating FAB with pulse animation | Task 5 |
| Chat panel 360×480, minimize button | Task 5 |
| Welcome message on open | Task 5 |
| User/AI bubbles, streaming animation | Task 5 |
| `queryInventory` city + audience + budget + type filters | Task 1 |
| Top 3 by baseMatchScore | Task 1 |
| Fallback to full inventory when nothing matches | Task 1 |
| Venue cards with 規劃 button after streaming | Task 5 |
| `InventoryMapPreview` deleted | Task 6 |

All spec requirements covered. No placeholders. Type names consistent across all tasks.

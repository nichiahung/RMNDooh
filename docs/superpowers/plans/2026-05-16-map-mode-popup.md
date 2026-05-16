# Map Mode Popup Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing static Leaflet Popup HTML in map mode with a rich `MapPopupCard` React component that lets users add a location to the media plan directly, without opening the full-screen `InventoryDetailCard` modal.

**Architecture:** Create a new `MapPopupCard` component rendered as children of the Leaflet `<Popup>`. Thread an `onAdd` prop from `CampaignPlannerPage` → `InventoryDiscovery` → `MapWrapper` → `MapView`. The full `InventoryDetailCard` modal remains unchanged; the popup's "詳情 →" button triggers it.

**Tech Stack:** React, react-leaflet v4, TypeScript, TailwindCSS, Vitest

---

## File Map

| Action | File |
|--------|------|
| **Create** | `src/components/campaign-planner/MapPopupCard.tsx` |
| **Modify** | `src/components/campaign-planner/MapView.tsx` |
| **Modify** | `src/components/campaign-planner/MapWrapper.tsx` |
| **Modify** | `src/components/campaign-planner/InventoryDiscovery.tsx` |
| **Create** | `src/__tests__/availabilityLabel.test.ts` |
| **Create** | `src/utils/availabilityLabel.ts` |

---

## Task 1: Availability label utility + tests

**Files:**
- Create: `src/utils/availabilityLabel.ts`
- Create: `src/__tests__/availabilityLabel.test.ts`

- [ ] **Step 1.1 — Write the failing test**

```ts
// src/__tests__/availabilityLabel.test.ts
import { describe, it, expect } from 'vitest';
import { availabilityLabel } from '@/utils/availabilityLabel';

describe('availabilityLabel', () => {
  it('returns green badge for high availability', () => {
    const result = availabilityLabel(0.8);
    expect(result.text).toBe('80% 可用');
    expect(result.colorClass).toBe('bg-emerald-500');
  });

  it('returns amber badge for limited availability', () => {
    const result = availabilityLabel(0.5);
    expect(result.text).toBe('50% 可用');
    expect(result.colorClass).toBe('bg-amber-500');
  });

  it('returns slate badge for low availability', () => {
    const result = availabilityLabel(0.2);
    expect(result.text).toBe('20% 可用');
    expect(result.colorClass).toBe('bg-slate-400');
  });

  it('treats exactly 0.7 as high', () => {
    expect(availabilityLabel(0.7).colorClass).toBe('bg-emerald-500');
  });

  it('treats exactly 0.3 as limited', () => {
    expect(availabilityLabel(0.3).colorClass).toBe('bg-amber-500');
  });
});
```

- [ ] **Step 1.2 — Run to confirm failure**

```bash
cd /Users/jack.ni/Personal/DOOH && npx vitest run src/__tests__/availabilityLabel.test.ts
```

Expected: `Cannot find module '@/utils/availabilityLabel'`

- [ ] **Step 1.3 — Implement the utility**

```ts
// src/utils/availabilityLabel.ts
export function availabilityLabel(availability: number): {
  text: string;
  colorClass: string;
} {
  const pct = Math.round(availability * 100);
  if (availability >= 0.7) return { text: `${pct}% 可用`, colorClass: 'bg-emerald-500' };
  if (availability >= 0.3) return { text: `${pct}% 可用`, colorClass: 'bg-amber-500' };
  return { text: `${pct}% 可用`, colorClass: 'bg-slate-400' };
}
```

- [ ] **Step 1.4 — Run to confirm pass**

```bash
cd /Users/jack.ni/Personal/DOOH && npx vitest run src/__tests__/availabilityLabel.test.ts
```

Expected: 5 tests pass, 0 failures.

- [ ] **Step 1.5 — Commit**

```bash
git add src/utils/availabilityLabel.ts src/__tests__/availabilityLabel.test.ts
git commit -m "feat: add availabilityLabel utility with tests"
```

---

## Task 2: Create `MapPopupCard` component

**Files:**
- Create: `src/components/campaign-planner/MapPopupCard.tsx`

- [ ] **Step 2.1 — Create the component**

```tsx
// src/components/campaign-planner/MapPopupCard.tsx
'use client';

import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatCompact, formatCPM } from '@/utils/formatters';
import { availabilityLabel } from '@/utils/availabilityLabel';
import { imgSrc } from '@/utils/imgSrc';
import { X, Check } from 'lucide-react';

interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onAdd: () => void;
  onViewDetail: () => void;
  onClose: () => void;
}

export function MapPopupCard({ item, isSelected, onAdd, onViewDetail, onClose }: Props) {
  const avail = availabilityLabel(item.availability);
  const canAdd = item.availability >= 0.3;

  return (
    <div className="w-60 font-sans rounded-xl overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Thumbnail */}
      <div className="relative h-28 bg-slate-200">
        <img
          src={imgSrc(item.imageUrl)}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1579548485295-e2336336e8b4?auto=format&fit=crop&q=80&w=400';
          }}
        />
        <span
          className={`absolute top-2 left-2 ${avail.colorClass} text-white text-[10px] font-bold px-2 py-0.5 rounded`}
        >
          {avail.text}
        </span>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
          aria-label="關閉"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 bg-white">
        {/* Tags */}
        <div className="flex gap-1.5 mb-1.5">
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
            {item.venueType}
          </span>
          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">
            {item.screenType}
          </span>
        </div>

        {/* Name + address */}
        <div className="font-bold text-slate-900 text-sm leading-tight mb-0.5 line-clamp-1">
          {item.name}
        </div>
        <div className="text-[10px] text-slate-400 mb-3 line-clamp-1">
          📍 {item.district}, {item.city}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">日費</div>
            <div className="text-xs font-bold text-indigo-600">{formatCurrency(item.pricePerDay)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">CPM</div>
            <div className="text-xs font-bold text-slate-800">NT${formatCPM(item.cpm)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">每日曝光</div>
            <div className="text-xs font-bold text-slate-800">{formatCompact(item.dailyImpressions)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">最低預訂</div>
            <div className="text-xs font-bold text-slate-800">7 天</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            disabled={isSelected || !canAdd}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              isSelected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                : !canAdd
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSelected ? (
              <><Check className="w-3.5 h-3.5" /> 已加入</>
            ) : !canAdd ? (
              '無庫存'
            ) : (
              '＋ 加入計畫'
            )}
          </button>
          <button
            onClick={onViewDetail}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            詳情 →
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.2 — Verify TypeScript compiles (no test needed for pure UI)**

```bash
cd /Users/jack.ni/Personal/DOOH && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `MapPopupCard.tsx`.

- [ ] **Step 2.3 — Commit**

```bash
git add src/components/campaign-planner/MapPopupCard.tsx
git commit -m "feat: add MapPopupCard component for map mode inline actions"
```

---

## Task 3: Update `MapView.tsx`

Replace the static Leaflet Popup HTML with `<MapPopupCard>`, add `onAdd` prop, and stop auto-opening the detail modal on pin click.

**Files:**
- Modify: `src/components/campaign-planner/MapView.tsx`

- [ ] **Step 3.1 — Replace MapView contents**

Replace the entire contents of `src/components/campaign-planner/MapView.tsx` with:

```tsx
'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { isInMediaPlan } from '@/utils/mediaPlanCalculations';
import { useI18n } from '@/i18n/I18nProvider';
import { MapPopupCard } from './MapPopupCard';

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}

const createIcon = (color: string, isSelected: boolean) => {
  const w = 40;
  const h = 52;
  const pulse = isSelected
    ? `<div style="position:absolute;top:-6px;left:-6px;width:${w + 12}px;height:${w + 12}px;border-radius:50%;background:${color};opacity:0.3;animation:lp 1.5s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
    html: `
      <div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.4));cursor:pointer;">
        ${pulse}
        <svg viewBox="0 0 40 52" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="20" r="9" fill="white" opacity="0.95"/>
        </svg>
      </div>
      <style>@keyframes lp{75%,100%{transform:scale(2.2);opacity:0}}</style>
    `
  });
};

function FitBounds({ inventory }: { inventory: InventoryLocation[] }) {
  const map = useMap();
  const fitted = React.useRef(false);

  React.useEffect(() => {
    if (inventory.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(inventory.map(i => [i.latitude, i.longitude]));
    map.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
    fitted.current = true;
  }, [inventory, map]);

  return null;
}

export function MapView({ inventory, selectedItems, onViewDetails, onAdd }: Props) {
  const { t } = useI18n();
  const center: [number, number] = [25.042, 121.565];

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20 px-4 bg-slate-100">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">No locations available on the map</p>
          <p className="text-sm text-slate-500">
            Try adjusting your filters to see more inventory on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#f1f5f9' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds inventory={inventory} />

        {inventory.map(item => {
          const isSelected = isInMediaPlan(selectedItems, item.id);
          let color = '#6366f1';
          if (isSelected) color = '#10b981';
          else if (item.availability < 0.3) color = '#94a3b8';
          else if (item.availability < 0.7) color = '#f59e0b';

          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={createIcon(color, isSelected)}
            >
              <Popup
                closeButton={false}
                className="map-popup-clean"
                minWidth={240}
                maxWidth={240}
              >
                {({ close }: { close: () => void }) => (
                  <MapPopupCard
                    item={item}
                    isSelected={isSelected}
                    onAdd={() => onAdd(item)}
                    onViewDetail={() => { close(); onViewDetails(item); }}
                    onClose={close}
                  />
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 z-[1000]">
        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Availability</h4>
        <div className="space-y-2">
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-200 mr-2"></span> {t('map.available')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-200 mr-2"></span> {t('map.limited')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-200 mr-2"></span> {t('map.unavailable')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium pt-1 border-t border-slate-100">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 mr-2"></span> {t('map.selectedInPlan')}
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200 font-semibold text-slate-800 text-sm z-[1000]">
        {t('planner.showing')} {inventory.length} {t('planner.locations')}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2 — Add Popup style override to globals.css**

Open `src/app/globals.css` and add at the bottom:

```css
/* Remove default Leaflet Popup chrome — MapPopupCard supplies its own styling */
.map-popup-clean .leaflet-popup-content-wrapper {
  padding: 0;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}
.map-popup-clean .leaflet-popup-content {
  margin: 0;
  width: auto !important;
}
.map-popup-clean .leaflet-popup-tip-container {
  display: none;
}
```

- [ ] **Step 3.3 — Verify TypeScript**

```bash
cd /Users/jack.ni/Personal/DOOH && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. If `Popup` render-prop signature causes a TS error (react-leaflet's `<Popup>` may not support render-prop children in all versions), use this fallback in the Marker block instead:

```tsx
// Fallback if render-prop doesn't typecheck:
// Remove the render-prop approach and use a ref + imperative close:

// In MapView component, add state:
// const [openId, setOpenId] = React.useState<string | null>(null);
// Then on Marker: eventHandlers={{ click: () => setOpenId(item.id) }}
// And Popup: open={openId === item.id}
// And MapPopupCard: onClose={() => setOpenId(null)}
```

Check the installed react-leaflet version to decide:
```bash
cat /Users/jack.ni/Personal/DOOH/node_modules/react-leaflet/package.json | grep '"version"'
```

- [ ] **Step 3.4 — Commit**

```bash
git add src/components/campaign-planner/MapView.tsx src/app/globals.css
git commit -m "feat: replace MapView Popup HTML with MapPopupCard component"
```

---

## Task 4: Thread `onAdd` through `MapWrapper` → `InventoryDiscovery`

**Files:**
- Modify: `src/components/campaign-planner/MapWrapper.tsx`
- Modify: `src/components/campaign-planner/InventoryDiscovery.tsx`

- [ ] **Step 4.1 — Update `MapWrapper.tsx`**

Replace entire file contents:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { useI18n } from '@/i18n/I18nProvider';

function MapLoadingPlaceholder() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center h-full w-full bg-slate-100">
      <div className="text-sm text-slate-500 animate-pulse">{t('map.loading')}</div>
    </div>
  );
}

const MapView = dynamic(
  () => import('./MapView').then(mod => mod.MapView),
  { ssr: false, loading: () => <MapLoadingPlaceholder /> }
);

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}

export function MapWrapper({ inventory, selectedItems, onViewDetails, onAdd }: Props) {
  return (
    <MapView
      inventory={inventory}
      selectedItems={selectedItems}
      onViewDetails={onViewDetails}
      onAdd={onAdd}
    />
  );
}
```

- [ ] **Step 4.2 — Update `InventoryDiscovery.tsx`**

Replace entire file contents:

```tsx
'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { ListView } from './ListView';
import { MapWrapper } from './MapWrapper';
import { PlannerTopbar } from './PlannerTopbar';

interface Props {
  inventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string;
}

export function InventoryDiscovery({
  inventory,
  sortOption,
  onSortChange,
  currentView,
  onViewChange,
  selectedItems,
  onViewDetails,
  onAdd,
  objective,
}: Props) {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50 relative">
      <PlannerTopbar
        resultCount={inventory.length}
        sortOption={sortOption}
        onSortChange={onSortChange}
        currentView={currentView}
        onViewChange={onViewChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentView === 'list' ? (
          <ListView
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
            objective={objective}
          />
        ) : (
          <MapWrapper
            inventory={inventory}
            selectedItems={selectedItems}
            onViewDetails={onViewDetails}
            onAdd={onAdd}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.3 — Verify TypeScript**

```bash
cd /Users/jack.ni/Personal/DOOH && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If `CampaignPlannerPage` now has a type error (it passes `onAdd` but the old `InventoryDiscovery` didn't require it), that's fine — the prop was already being passed, we're just making it explicit.

- [ ] **Step 4.4 — Run all tests**

```bash
cd /Users/jack.ni/Personal/DOOH && npx vitest run
```

Expected: all tests pass (including the new `availabilityLabel` test from Task 1).

- [ ] **Step 4.5 — Commit**

```bash
git add src/components/campaign-planner/MapWrapper.tsx src/components/campaign-planner/InventoryDiscovery.tsx
git commit -m "feat: thread onAdd prop through MapWrapper and InventoryDiscovery"
```

---

## Task 5: Smoke test in browser

- [ ] **Step 5.1 — Start dev server**

```bash
cd /Users/jack.ni/Personal/DOOH && npm run dev
```

- [ ] **Step 5.2 — Manual test checklist**

Open `http://localhost:3000` and navigate to Campaign Planner → switch to Map view.

| Scenario | Expected |
|----------|----------|
| Click an available pin (indigo) | MapPopupCard opens with image, tags, stats, green "＋ 加入計畫" button |
| Click "＋ 加入計畫" | Button changes to "已加入 ✓", pin turns emerald with pulse animation |
| Click "詳情 →" | Popup closes, InventoryDetailCard full-screen modal opens |
| Close detail modal | Returns to map with pin state preserved |
| Click an unavailable pin (slate, availability < 0.3) | Popup opens with "無庫存" disabled button |
| Click an amber pin (limited, availability 0.3–0.7) | Popup opens with amber badge, "＋ 加入計畫" still enabled |
| Click map blank area | Popup closes |
| Click X button in popup | Popup closes |
| Already-selected pin | Popup shows "已加入 ✓" disabled; pin is green |

- [ ] **Step 5.3 — Final commit**

```bash
git add -A && git commit -m "feat: map mode direct add-to-plan via MapPopupCard"
```

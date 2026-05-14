# Venue DNA + Real-Time Performance Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audience DNA panels, a real-time matchScore badge on inventory cards, and a sticky bottom performance bar that updates live as venues are selected in the Campaign Planner.

**Architecture:** Extend `InventoryLocation` with a `VenueDNA` sub-object holding mock audience/timing data; derive matchScore at runtime via a pure utility; add a fixed-bottom `PerformanceBar` component wired to selected items; enhance `InventoryCard` with an SVG circle badge; expand `InventoryDetailCard` with five DNA sections rendered in pure Tailwind CSS.

**Tech Stack:** Next.js App Router (static export), React 19, Tailwind CSS v4, TypeScript, Vitest (added in Task 1 for pure-function tests), Lucide React icons.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/inventory.ts` | Modify | Add `VenueDNA` interface + `dna` field to `InventoryLocation` |
| `src/utils/matchScore.ts` | Create | Pure `computeMatchScore(venue, objective?)` utility |
| `src/__tests__/matchScore.test.ts` | Create | Unit tests for matchScore |
| `src/utils/formatters.ts` | Modify | Add `formatCompact` (1.2M / 450K) |
| `src/lib/mockData.ts` | Modify | Add `dna` data to all 10 venues |
| `src/components/campaign-planner/PerformanceBar.tsx` | Create | Sticky bottom metrics bar |
| `src/components/campaign-planner/InventoryCard.tsx` | Modify | Add `objective?` prop + SVG matchScore badge |
| `src/components/campaign-planner/InventoryDiscovery.tsx` | Modify | Thread `objective?` prop |
| `src/components/campaign-planner/ListView.tsx` | Modify | Thread `objective?` prop |
| `src/components/campaign-planner/InventoryDetailCard.tsx` | Modify | Add `objective?` prop + 5 DNA sections |
| `src/components/campaign-planner/CampaignPlannerPage.tsx` | Modify | Mount PerformanceBar, pass objective everywhere |
| `vitest.config.ts` | Create | Vitest config |
| `package.json` | Modify | Add test deps + `test` script |

---

## Task 1: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

Expected: vitest and @vitejs/plugin-react appear in devDependencies.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest for unit tests"
```

---

## Task 2: VenueDNA Type Extension

**Files:**
- Modify: `src/types/inventory.ts`

- [ ] **Step 1: Add VenueDNA interface and extend InventoryLocation**

In `src/types/inventory.ts`, insert after the existing type/interface imports and before `InventoryLocation`:

```ts
export interface VenueDNA {
  ageBreakdown: { label: string; pct: number }[];
  genderSplit: { male: number; female: number };
  audienceSegments: { label: string; pct: number }[];
  peakHours: number[]; // 24 values, 0.0–1.0 relative intensity
  weekdayPct: number;  // 0–100
  nearbyPOIs: { name: string; distance: string }[];
  rankings: {
    cityRank: number; cityTotal: number;
    districtRank: number; districtTotal: number;
    typeRank: number; typeTotal: number;
  };
  baseMatchScore: number; // 0–100 static baseline
}
```

Then in `InventoryLocation`, add:

```ts
  dna: VenueDNA;
```

after the existing `description: string;` field.

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: Errors on `mockData.ts` for missing `dna` field — that's fine, we fix it in Task 4. All other files should be clean.

- [ ] **Step 3: Commit**

```bash
git add src/types/inventory.ts
git commit -m "feat: add VenueDNA type to InventoryLocation"
```

---

## Task 3: computeMatchScore Utility (TDD)

**Files:**
- Create: `src/__tests__/matchScore.test.ts`
- Create: `src/utils/matchScore.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/matchScore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '@/utils/matchScore';
import type { InventoryLocation } from '@/types/inventory';

const baseVenue = {
  venueType: 'Mall',
  audienceTags: ['Shoppers', 'Tourists'],
  dna: { baseMatchScore: 70 },
} as unknown as InventoryLocation;

describe('computeMatchScore', () => {
  it('returns baseMatchScore when no objective provided', () => {
    expect(computeMatchScore(baseVenue)).toBe(70);
  });

  it('boosts score for matching venueType + audienceTags (Brand Awareness)', () => {
    // Mall matches Brand Awareness (+15), Shoppers matches (+8), Tourists matches (+8)
    // 70 + 15 + 8 + 8 = 101 → capped at 100
    expect(computeMatchScore(baseVenue, 'Brand Awareness')).toBe(100);
  });

  it('boosts score for Foot Traffic with matching venue', () => {
    // Mall +15, Shoppers +8 → 70 + 15 + 8 = 93
    expect(computeMatchScore(baseVenue, 'Foot Traffic')).toBe(93);
  });

  it('returns baseMatchScore for unrecognised objective', () => {
    expect(computeMatchScore(baseVenue, 'Unknown Objective')).toBe(70);
  });

  it('never exceeds 100', () => {
    const highVenue = {
      venueType: 'Office Building',
      audienceTags: ['Professionals', 'Tech Workers', 'Commuters'],
      dna: { baseMatchScore: 95 },
    } as unknown as InventoryLocation;
    expect(computeMatchScore(highVenue, 'Direct Response')).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/utils/matchScore'`

- [ ] **Step 3: Create the implementation**

Create `src/utils/matchScore.ts`:

```ts
import type { InventoryLocation, VenueType, AudienceTag } from '@/types/inventory';

interface ObjectiveBoost {
  venueTypes: VenueType[];
  audienceTags: AudienceTag[];
}

const BOOST_MAP: Record<string, ObjectiveBoost> = {
  'Brand Awareness': {
    venueTypes: ['Mall', 'Airport', 'Highway'],
    audienceTags: ['Tourists', 'Shoppers'],
  },
  'Foot Traffic': {
    venueTypes: ['Mall', 'Street', 'Night Market'],
    audienceTags: ['Shoppers', 'Foodies'],
  },
  'Direct Response': {
    venueTypes: ['Office Building', 'Subway', 'Station'],
    audienceTags: ['Professionals', 'Tech Workers', 'Commuters'],
  },
};

export function computeMatchScore(venue: InventoryLocation, objective?: string): number {
  let score = venue.dna.baseMatchScore;
  if (!objective) return score;

  const boost = BOOST_MAP[objective];
  if (!boost) return score;

  if (boost.venueTypes.includes(venue.venueType)) score += 15;
  for (const tag of venue.audienceTags) {
    if (boost.audienceTags.includes(tag as AudienceTag)) score += 8;
  }

  return Math.min(100, score);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/matchScore.test.ts src/utils/matchScore.ts
git commit -m "feat: add computeMatchScore utility with TDD coverage"
```

---

## Task 4: Mock DNA Data (All 10 Venues)

**Files:**
- Modify: `src/lib/mockData.ts`

Add a `dna` field to each of the 10 `InventoryLocation` objects. Insert after each venue's `description` field.

- [ ] **Step 1: Add DNA data to venues 1–5**

In `src/lib/mockData.ts`, add `dna` to the first five venues in this order:

**`inv-tpe-101` (Taipei 101 — Mall, Xinyi):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 20 }, { label: '25-34', pct: 38 },
        { label: '35-44', pct: 27 }, { label: '45+', pct: 15 },
      ],
      genderSplit: { male: 44, female: 56 },
      audienceSegments: [
        { label: '觀光客', pct: 40 }, { label: '購物族', pct: 35 }, { label: '上班族', pct: 25 },
      ],
      peakHours: [0.1,0.05,0.05,0.05,0.1,0.15,0.2,0.3,0.4,0.55,0.7,0.8,0.85,0.9,0.95,1.0,0.95,0.9,0.85,0.75,0.65,0.5,0.3,0.15],
      weekdayPct: 58,
      nearbyPOIs: [
        { name: 'Taipei 101', distance: '0.0 km' },
        { name: 'ATT 4 FUN', distance: '0.2 km' },
        { name: 'Eslite Spectrum', distance: '0.3 km' },
        { name: 'W Hotel Taipei', distance: '0.1 km' },
        { name: 'Shin Kong Mitsukoshi', distance: '0.4 km' },
      ],
      rankings: { cityRank: 2, cityTotal: 45, districtRank: 1, districtTotal: 8, typeRank: 1, typeTotal: 12 },
      baseMatchScore: 88,
    },
```

**`inv-tpe-main` (Taipei Main Station — Station, Zhongzheng):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 28 }, { label: '25-34', pct: 32 },
        { label: '35-44', pct: 24 }, { label: '45+', pct: 16 },
      ],
      genderSplit: { male: 52, female: 48 },
      audienceSegments: [
        { label: '通勤族', pct: 44 }, { label: '觀光客', pct: 30 }, { label: '學生族', pct: 26 },
      ],
      peakHours: [0.1,0.1,0.1,0.1,0.15,0.3,0.6,1.0,0.95,0.5,0.4,0.55,0.65,0.5,0.4,0.5,0.7,1.0,0.95,0.7,0.5,0.35,0.2,0.1],
      weekdayPct: 72,
      nearbyPOIs: [
        { name: 'Q Square Mall', distance: '0.1 km' },
        { name: 'Guanqian Night Market', distance: '0.3 km' },
        { name: 'Presidential Palace', distance: '0.8 km' },
        { name: 'Ximending', distance: '0.9 km' },
      ],
      rankings: { cityRank: 1, cityTotal: 45, districtRank: 1, districtTotal: 5, typeRank: 1, typeTotal: 8 },
      baseMatchScore: 85,
    },
```

**`inv-tpe-sogo` (Zhongxiao Fuxing SOGO — Street, Da'an):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 22 }, { label: '25-34', pct: 40 },
        { label: '35-44', pct: 28 }, { label: '45+', pct: 10 },
      ],
      genderSplit: { male: 38, female: 62 },
      audienceSegments: [
        { label: '購物族', pct: 48 }, { label: '上班族', pct: 35 }, { label: '學生族', pct: 17 },
      ],
      peakHours: [0.05,0.05,0.05,0.05,0.1,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.9,0.95,1.0,0.95,0.85,0.8,0.7,0.55,0.4,0.25,0.1],
      weekdayPct: 55,
      nearbyPOIs: [
        { name: 'SOGO Zhongxiao', distance: '0.0 km' },
        { name: 'Pacific SOGO', distance: '0.1 km' },
        { name: 'Breeze Nanjing', distance: '0.5 km' },
        { name: 'Dunnan Cultural District', distance: '0.3 km' },
      ],
      rankings: { cityRank: 4, cityTotal: 45, districtRank: 2, districtTotal: 6, typeRank: 3, typeTotal: 15 },
      baseMatchScore: 80,
    },
```

**`inv-tpe-ximen` (Ximending — Street/Mega Screen, Wanhua):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 42 }, { label: '25-34', pct: 30 },
        { label: '35-44', pct: 18 }, { label: '45+', pct: 10 },
      ],
      genderSplit: { male: 46, female: 54 },
      audienceSegments: [
        { label: '學生族', pct: 40 }, { label: '觀光客', pct: 32 }, { label: '購物族', pct: 28 },
      ],
      peakHours: [0.2,0.1,0.05,0.05,0.05,0.05,0.1,0.2,0.3,0.4,0.5,0.6,0.65,0.7,0.8,0.9,0.95,1.0,1.0,0.95,0.9,0.8,0.65,0.4],
      weekdayPct: 45,
      nearbyPOIs: [
        { name: 'Ximending Pedestrian Zone', distance: '0.0 km' },
        { name: 'Red House Theater', distance: '0.1 km' },
        { name: 'Comix Manga Store', distance: '0.2 km' },
        { name: 'Wanhua Night Market', distance: '0.6 km' },
      ],
      rankings: { cityRank: 3, cityTotal: 45, districtRank: 1, districtTotal: 4, typeRank: 2, typeTotal: 12 },
      baseMatchScore: 78,
    },
```

**`inv-tpe-nangang` (Nangang Software Park — Office Building, Nangang):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 12 }, { label: '25-34', pct: 45 },
        { label: '35-44', pct: 35 }, { label: '45+', pct: 8 },
      ],
      genderSplit: { male: 68, female: 32 },
      audienceSegments: [
        { label: '科技業', pct: 52 }, { label: '上班族', pct: 35 }, { label: '通勤族', pct: 13 },
      ],
      peakHours: [0.05,0.05,0.05,0.05,0.1,0.2,0.4,0.8,1.0,0.9,0.7,0.6,0.85,0.7,0.65,0.7,0.9,1.0,0.7,0.35,0.15,0.1,0.05,0.05],
      weekdayPct: 88,
      nearbyPOIs: [
        { name: 'Nangang Software Park', distance: '0.0 km' },
        { name: 'Nangang Exhibition Center', distance: '0.5 km' },
        { name: 'Big City Mall', distance: '0.8 km' },
        { name: 'Academia Sinica', distance: '1.2 km' },
      ],
      rankings: { cityRank: 8, cityTotal: 45, districtRank: 1, districtTotal: 3, typeRank: 1, typeTotal: 6 },
      baseMatchScore: 72,
    },
```

- [ ] **Step 2: Add DNA data to venues 6–10**

**`inv-tpe-songshan` (Songshan Airport — Airport, Songshan):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 15 }, { label: '25-34', pct: 32 },
        { label: '35-44', pct: 38 }, { label: '45+', pct: 15 },
      ],
      genderSplit: { male: 58, female: 42 },
      audienceSegments: [
        { label: '商務旅客', pct: 45 }, { label: '觀光客', pct: 38 }, { label: '高消費族', pct: 17 },
      ],
      peakHours: [0.3,0.25,0.2,0.2,0.3,0.5,0.75,1.0,0.95,0.8,0.65,0.55,0.5,0.5,0.55,0.6,0.75,0.95,1.0,0.85,0.65,0.45,0.35,0.3],
      weekdayPct: 65,
      nearbyPOIs: [
        { name: 'Songshan Airport Terminal', distance: '0.0 km' },
        { name: 'Eslite Songshan', distance: '0.4 km' },
        { name: 'Zhongshan MRT Station', distance: '1.1 km' },
      ],
      rankings: { cityRank: 10, cityTotal: 45, districtRank: 1, districtTotal: 2, typeRank: 1, typeTotal: 2 },
      baseMatchScore: 75,
    },
```

**`inv-ntpc-banqiao` (Banqiao Station — Station, Banqiao):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 26 }, { label: '25-34', pct: 34 },
        { label: '35-44', pct: 26 }, { label: '45+', pct: 14 },
      ],
      genderSplit: { male: 50, female: 50 },
      audienceSegments: [
        { label: '通勤族', pct: 46 }, { label: '購物族', pct: 30 }, { label: '學生族', pct: 24 },
      ],
      peakHours: [0.1,0.1,0.1,0.1,0.2,0.35,0.65,1.0,0.9,0.5,0.4,0.55,0.65,0.5,0.4,0.55,0.75,1.0,0.95,0.7,0.5,0.3,0.2,0.1],
      weekdayPct: 70,
      nearbyPOIs: [
        { name: 'Banqiao Train Station', distance: '0.0 km' },
        { name: 'Far Eastern Department Store', distance: '0.2 km' },
        { name: 'Global Mall Banqiao', distance: '0.3 km' },
        { name: 'Banqiao 435 Art Zone', distance: '0.6 km' },
      ],
      rankings: { cityRank: 5, cityTotal: 45, districtRank: 1, districtTotal: 6, typeRank: 2, typeTotal: 8 },
      baseMatchScore: 76,
    },
```

**`inv-tpe-neihu` (Neihu Tech Park — Street, Neihu):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 10 }, { label: '25-34', pct: 48 },
        { label: '35-44', pct: 35 }, { label: '45+', pct: 7 },
      ],
      genderSplit: { male: 64, female: 36 },
      audienceSegments: [
        { label: '科技業', pct: 55 }, { label: '上班族', pct: 35 }, { label: '高消費族', pct: 10 },
      ],
      peakHours: [0.05,0.05,0.05,0.05,0.1,0.2,0.35,0.6,0.8,0.75,0.65,0.7,0.85,0.75,0.7,0.75,0.9,0.95,0.7,0.35,0.15,0.1,0.05,0.05],
      weekdayPct: 85,
      nearbyPOIs: [
        { name: 'Neihu Technology Park', distance: '0.1 km' },
        { name: 'IKEA Neihu', distance: '0.4 km' },
        { name: 'Carrefour Neihu', distance: '0.6 km' },
        { name: 'Costco Neihu', distance: '0.8 km' },
      ],
      rankings: { cityRank: 7, cityTotal: 45, districtRank: 1, districtTotal: 4, typeRank: 2, typeTotal: 15 },
      baseMatchScore: 70,
    },
```

**`inv-tpe-shilin` (Shilin Night Market — Night Market, Shilin):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 35 }, { label: '25-34', pct: 32 },
        { label: '35-44', pct: 20 }, { label: '45+', pct: 13 },
      ],
      genderSplit: { male: 48, female: 52 },
      audienceSegments: [
        { label: '美食愛好者', pct: 45 }, { label: '觀光客', pct: 35 }, { label: '學生族', pct: 20 },
      ],
      peakHours: [0.3,0.15,0.1,0.05,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.45,0.55,0.6,0.65,0.75,0.85,0.95,1.0,1.0,0.9,0.75,0.5],
      weekdayPct: 40,
      nearbyPOIs: [
        { name: 'Shilin Night Market', distance: '0.0 km' },
        { name: 'Shilin MRT Station', distance: '0.2 km' },
        { name: 'Tianmu Shopping District', distance: '1.0 km' },
        { name: 'Chiang Kai-shek Shilin Residence', distance: '0.6 km' },
      ],
      rankings: { cityRank: 6, cityTotal: 45, districtRank: 1, districtTotal: 3, typeRank: 1, typeTotal: 3 },
      baseMatchScore: 73,
    },
```

**`inv-tpe-gongguan` (Gongguan — Street, Zhongzheng):**
```ts
    dna: {
      ageBreakdown: [
        { label: '18-24', pct: 52 }, { label: '25-34', pct: 28 },
        { label: '35-44', pct: 14 }, { label: '45+', pct: 6 },
      ],
      genderSplit: { male: 45, female: 55 },
      audienceSegments: [
        { label: '學生族', pct: 55 }, { label: '美食愛好者', pct: 28 }, { label: '年輕上班族', pct: 17 },
      ],
      peakHours: [0.1,0.05,0.05,0.05,0.05,0.1,0.2,0.4,0.5,0.55,0.6,0.65,0.8,0.85,0.9,0.95,1.0,0.95,0.9,0.85,0.75,0.6,0.4,0.2],
      weekdayPct: 50,
      nearbyPOIs: [
        { name: 'National Taiwan University', distance: '0.2 km' },
        { name: 'Gongguan Night Market', distance: '0.1 km' },
        { name: 'Shida Night Market', distance: '0.7 km' },
        { name: 'Treasure Hill Artist Village', distance: '0.4 km' },
      ],
      rankings: { cityRank: 9, cityTotal: 45, districtRank: 2, districtTotal: 5, typeRank: 5, typeTotal: 15 },
      baseMatchScore: 65,
    },
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat: add VenueDNA mock data to all 10 inventory venues"
```

---

## Task 5: formatCompact + PerformanceBar

**Files:**
- Modify: `src/utils/formatters.ts`
- Create: `src/components/campaign-planner/PerformanceBar.tsx`
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

- [ ] **Step 1: Add formatCompact to formatters.ts**

At the bottom of `src/utils/formatters.ts`, add:

```ts
/**
 * Compact number: 1_200_000 → "1.2M", 450_000 → "450K", 999 → "999"
 */
export function formatCompact(value: number): string {
  if (isNaN(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
```

- [ ] **Step 2: Create PerformanceBar component**

Create `src/components/campaign-planner/PerformanceBar.tsx`:

```tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Eye, TrendingUp, DollarSign, Target, ChevronRight } from 'lucide-react';
import { MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { computeMatchScore } from '@/utils/matchScore';
import { formatCPM, formatCurrency, formatCompact } from '@/utils/formatters';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  objective?: string;
  onOpenSummary: () => void;
}

function AnimatedValue({ value }: { value: string | number }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 250);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`transition-colors duration-150 ${flash ? 'text-indigo-300' : 'text-white'}`}>
      {value}
    </span>
  );
}

export function PerformanceBar({ selectedItems, allInventory, objective, onOpenSummary }: Props) {
  const visible = selectedItems.length > 0;

  // Compute metrics
  let totalImpressions = 0;
  let totalBudget = 0;
  let matchScoreSum = 0;

  for (const item of selectedItems) {
    const venue = allInventory.find(v => v.id === item.inventoryId);
    if (!venue) continue;
    totalImpressions += venue.dailyImpressions * item.days;
    totalBudget += venue.pricePerDay * item.days;
    matchScoreSum += computeMatchScore(venue, objective);
  }

  const avgCpm = totalImpressions > 0 ? (totalBudget / totalImpressions) * 1000 : 0;
  const avgMatchScore = selectedItems.length > 0 ? Math.round(matchScoreSum / selectedItems.length) : 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-8 py-3">
        <div className="flex items-center gap-8">
          <Metric icon={<MapPin className="w-3.5 h-3.5" />} label="版位">
            <AnimatedValue value={`${selectedItems.length} 個`} />
          </Metric>
          <Metric icon={<Eye className="w-3.5 h-3.5" />} label="預估觸及">
            <AnimatedValue value={formatCompact(totalImpressions)} />
          </Metric>
          <Metric icon={<TrendingUp className="w-3.5 h-3.5" />} label="平均 CPM">
            <AnimatedValue value={`NT$${formatCPM(avgCpm)}`} />
          </Metric>
          <Metric icon={<DollarSign className="w-3.5 h-3.5" />} label="總費用">
            <AnimatedValue value={formatCurrency(totalBudget)} />
          </Metric>
          {objective && (
            <Metric icon={<Target className="w-3.5 h-3.5" />} label="DNA 吻合">
              <AnimatedValue value={`${avgMatchScore}%`} />
            </Metric>
          )}
        </div>
        <button
          onClick={onOpenSummary}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          查看媒體計劃 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile */}
      <button
        onClick={onOpenSummary}
        className="lg:hidden w-full flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-5 py-3"
      >
        <span className="text-sm text-slate-300">
          <span className="font-bold text-white">{selectedItems.length}</span> 個版位・
          <span className="font-bold text-white">{formatCurrency(totalBudget)}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</div>
        <div className="text-sm font-bold leading-none">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount PerformanceBar in CampaignPlannerPage**

In `src/components/campaign-planner/CampaignPlannerPage.tsx`, add the import at the top:

```tsx
import { PerformanceBar } from './PerformanceBar';
```

Then find the `{step === 'inventory' && ( ... )}` block. Inside it, after the `{selectedInventoryForDetail && ( <InventoryDetailCard ... /> )}` block and before the closing `</>` of that fragment, add:

```tsx
<PerformanceBar
  selectedItems={selectedItems}
  allInventory={allInventory}
  objective={filters.campaignObjective}
  onOpenSummary={() => setIsSummaryOpen(true)}
/>
```

- [ ] **Step 4: Add bottom padding so content isn't hidden behind the bar**

In `CampaignPlannerPage.tsx`, find the main content area div that wraps the filter sidebar + InventoryDiscovery + MediaPlanSummary (the flex row inside `step === 'inventory'`). Add `pb-16 lg:pb-14` to prevent content hiding behind the bar when items are selected.

- [ ] **Step 5: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000/campaign-planner. Add a venue to the media plan. Expected: a dark bar slides up from the bottom showing venue count, impressions, CPM, and budget. Numbers update when venues are added/removed.

- [ ] **Step 6: Commit**

```bash
git add src/utils/formatters.ts src/components/campaign-planner/PerformanceBar.tsx src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: add PerformanceBar with real-time metrics"
```

---

## Task 6: Thread Objective Prop + InventoryCard matchScore Badge

**Files:**
- Modify: `src/components/campaign-planner/InventoryDiscovery.tsx`
- Modify: `src/components/campaign-planner/ListView.tsx`
- Modify: `src/components/campaign-planner/InventoryCard.tsx`
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

- [ ] **Step 1: Add objective prop to InventoryDiscovery**

In `src/components/campaign-planner/InventoryDiscovery.tsx`, add `objective?: string` to the `Props` interface:

```ts
interface Props {
  inventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  currentView: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string; // new
}
```

In the destructured params:
```tsx
export function InventoryDiscovery({
  inventory, sortOption, onSortChange,
  currentView, onViewChange,
  selectedItems, onViewDetails, onAdd,
  objective, // new
}: Props) {
```

Find where `<ListView>` is rendered inside and add `objective={objective}`:
```tsx
<ListView
  inventory={inventory}
  selectedItems={selectedItems}
  onViewDetails={onViewDetails}
  onAdd={onAdd}
  objective={objective}
/>
```

(MapView shows markers and popups, not InventoryCards, so no change needed there.)

- [ ] **Step 2: Add objective prop to ListView**

In `src/components/campaign-planner/ListView.tsx`, add `objective?: string` to `Props`:

```ts
interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string; // new
}
```

Pass it to each `<InventoryCard>`:
```tsx
<InventoryCard
  key={item.id}
  item={item}
  isSelected={isInMediaPlan(selectedItems, item.id)}
  onViewDetails={() => onViewDetails(item)}
  onAdd={() => onAdd(item)}
  objective={objective}
/>
```

- [ ] **Step 3: Add matchScore badge to InventoryCard**

In `src/components/campaign-planner/InventoryCard.tsx`:

Add import at top:
```tsx
import { computeMatchScore } from '@/utils/matchScore';
```

Add `objective?: string` to `Props` interface:
```ts
interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onViewDetails: () => void;
  onAdd: () => void;
  objective?: string; // new
}
```

Inside the image section (`<div className="h-40 relative overflow-hidden bg-slate-100">`), after the existing badges, add:

```tsx
{objective && (() => {
  const score = computeMatchScore(item, objective);
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#94a3b8';
  const circumference = 100;
  return (
    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3"
            strokeDasharray={`${circumference} ${circumference}`} />
          <circle cx="18" cy="18" r="15.9155" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${score} ${circumference - score}`}
            strokeLinecap="round" />
        </svg>
        <span className="text-[9px] font-bold text-slate-800 z-10 leading-none">{score}%</span>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: Pass objective from CampaignPlannerPage to InventoryDiscovery**

In `src/components/campaign-planner/CampaignPlannerPage.tsx`, find the `<InventoryDiscovery>` JSX and add:

```tsx
objective={filters.campaignObjective}
```

- [ ] **Step 5: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000/campaign-planner. In the Filter sidebar, set "Campaign Objective" to "Brand Awareness". Expected: green/amber/grey SVG score rings appear at the bottom-left of each venue card image, showing different percentages.

- [ ] **Step 6: Commit**

```bash
git add src/components/campaign-planner/InventoryDiscovery.tsx src/components/campaign-planner/ListView.tsx src/components/campaign-planner/InventoryCard.tsx src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: thread objective prop and add matchScore badge to InventoryCard"
```

---

## Task 7: DNA Panel in InventoryDetailCard

**Files:**
- Modify: `src/components/campaign-planner/InventoryDetailCard.tsx`
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

- [ ] **Step 1: Add objective prop and imports to InventoryDetailCard**

In `src/components/campaign-planner/InventoryDetailCard.tsx`, add imports:
```tsx
import { computeMatchScore } from '@/utils/matchScore';
```

Add `objective?: string` to the `Props` interface:
```ts
interface Props {
  item: InventoryLocation;
  isSelected: boolean;
  onClose: () => void;
  onAdd: () => void;
  objective?: string; // new
}
```

Destructure it:
```tsx
export function InventoryDetailCard({ item, isSelected, onClose, onAdd, objective }: Props) {
```

- [ ] **Step 2: Add matchScore ring + DNA sections after audience tags**

Find the existing audience tags section (the `<div>` with `h3` "Audience Demographics" and the tag chips). After it, add the following DNA panel:

```tsx
{/* DNA Panel */}
<div className="space-y-6 mt-6 pt-6 border-t border-slate-100">

  {/* matchScore ring (only when objective is set) */}
  {objective && (() => {
    const score = computeMatchScore(item, objective);
    const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#94a3b8';
    const label = score >= 75 ? '高度吻合' : score >= 50 ? '部分吻合' : '低度吻合';
    return (
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3"
              strokeDasharray="100 100" />
            <circle cx="18" cy="18" r="15.9155" fill="none"
              stroke={color} strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round" />
          </svg>
          <span className="text-sm font-bold text-slate-800 z-10">{score}%</span>
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">{label}</div>
          <div className="text-xs text-slate-500 mt-0.5">與「{objective}」目標的受眾吻合度</div>
        </div>
      </div>
    );
  })()}

  {/* Audience Profile */}
  <div>
    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">受眾輪廓</h3>

    {/* Age Breakdown */}
    <div className="mb-4">
      <div className="text-xs text-slate-500 mb-2 font-medium">年齡分布</div>
      <div className="space-y-2">
        {item.dna.ageBreakdown.map(({ label, pct }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12 flex-shrink-0">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
          </div>
        ))}
      </div>
    </div>

    {/* Gender Split */}
    <div className="mb-4">
      <div className="text-xs text-slate-500 mb-2 font-medium">性別分布</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-12 flex-shrink-0">男 {item.dna.genderSplit.male}%</span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden">
          <div className="bg-blue-400 h-full" style={{ width: `${item.dna.genderSplit.male}%` }} />
          <div className="bg-pink-400 h-full flex-1" />
        </div>
        <span className="text-xs text-slate-500 w-12 text-right">女 {item.dna.genderSplit.female}%</span>
      </div>
    </div>

    {/* Audience Segments */}
    <div className="text-xs text-slate-500 mb-2 font-medium">主要族群</div>
    <div className="flex flex-wrap gap-2">
      {item.dna.audienceSegments.map(({ label, pct }) => (
        <span key={label} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2.5 py-1 rounded-full">
          {label} {pct}%
        </span>
      ))}
    </div>
  </div>

  {/* Peak Hours */}
  <div>
    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">尖峰時段</h3>
    <div className="flex items-end gap-px h-12">
      {item.dna.peakHours.map((intensity, hour) => {
        const isTop3 = [...item.dna.peakHours]
          .map((v, i) => ({ v, i }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 3)
          .some(t => t.i === hour);
        return (
          <div
            key={hour}
            className="flex-1"
            style={{ height: `${Math.max(4, intensity * 100)}%` }}
            title={`${hour}:00 — ${intensity.toFixed(1)}x`}
          >
            <div className={`w-full h-full rounded-sm ${isTop3 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          </div>
        );
      })}
    </div>
    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
      {[0, 6, 12, 18, 23].map(h => (
        <span key={h}>{h}</span>
      ))}
    </div>
  </div>

  {/* Weekday / Weekend */}
  <div>
    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">週間 / 假日分佈</h3>
    <div className="space-y-2">
      {[
        { label: '平日', pct: item.dna.weekdayPct, color: 'bg-indigo-500' },
        { label: '假日', pct: 100 - item.dna.weekdayPct, color: 'bg-violet-400' },
      ].map(({ label, pct, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8 flex-shrink-0">{label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
        </div>
      ))}
    </div>
  </div>

  {/* Nearby POIs */}
  <div>
    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">周邊 POI</h3>
    <ul className="space-y-2">
      {item.dna.nearbyPOIs.map(({ name, distance }) => (
        <li key={name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            {name}
          </span>
          <span className="text-xs text-slate-400 ml-4 flex-shrink-0">{distance}</span>
        </li>
      ))}
    </ul>
  </div>

  {/* Rankings */}
  <div>
    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">版位排名</h3>
    <div className="flex flex-wrap gap-2">
      <RankChip label="全台" rank={item.dna.rankings.cityRank} total={item.dna.rankings.cityTotal} />
      <RankChip label={item.district} rank={item.dna.rankings.districtRank} total={item.dna.rankings.districtTotal} />
      <RankChip label={item.screenType} rank={item.dna.rankings.typeRank} total={item.dna.rankings.typeTotal} />
    </div>
  </div>

</div>
```

Also add a `RankChip` helper component at the bottom of the file (outside `InventoryDetailCard`):

```tsx
function RankChip({ label, rank, total }: { label: string; rank: number; total: number }) {
  const isTop3 = rank <= 3;
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      isTop3
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      {isTop3 && '🏆'} {label} #{rank} / {total}
    </span>
  );
}
```

- [ ] **Step 3: Pass objective from CampaignPlannerPage to InventoryDetailCard**

In `src/components/campaign-planner/CampaignPlannerPage.tsx`, find the `<InventoryDetailCard>` render (around line 222, inside the `step === 'inventory'` block) and add:

```tsx
{selectedInventoryForDetail && (
  <InventoryDetailCard
    item={selectedInventoryForDetail}
    isSelected={selectedItems.some(i => i.inventoryId === selectedInventoryForDetail.id)}
    onClose={() => setSelectedInventoryForDetail(null)}
    onAdd={() => handleAdd(selectedInventoryForDetail)}
    objective={filters.campaignObjective}   {/* add this line */}
  />
)}
```

- [ ] **Step 4: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000/campaign-planner. Set Campaign Objective filter to "Direct Response". Click the info icon on any venue. Expected: DNA panel shows age bars, gender split, audience segments, 24-hour peak chart (3 highlighted bars), weekday/weekend split, POI list, and ranking chips. If objective is set, a large matchScore ring appears at the top of the DNA panel.

- [ ] **Step 5: Commit**

```bash
git add src/components/campaign-planner/InventoryDetailCard.tsx src/components/campaign-planner/CampaignPlannerPage.tsx
git commit -m "feat: add audience DNA panel to InventoryDetailCard"
```

---

## Done

Run `npm run build` to confirm no TypeScript or build errors before calling this complete.

```bash
npm run build
```

Expected: Build succeeds with no type errors.

# Airbnb-Style Mobile Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compact mobile filter tab drawer with a focused competitor-inspired mobile filter sheet for Campaign Planner inventory discovery.

**Architecture:** Keep `MobileFilterSheet` as the mobile-only surface used by `CampaignPlannerPage`. Add a small presentation helper for result CTA text so behavior can be covered by Vitest, then wire search and result count through existing planner state.

**Tech Stack:** Next.js App Router, React 19, TailwindCSS, Zustand-backed inventory source, Vitest.

---

### Task 1: Result CTA Presentation Helper

**Files:**
- Create: `src/utils/mobileFilterSheet.ts`
- Create: `src/__tests__/mobileFilterSheet.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { formatMobileFilterResultCta } from '@/utils/mobileFilterSheet';

describe('formatMobileFilterResultCta', () => {
  it('formats the mobile filter primary action around matching inventory count', () => {
    expect(formatMobileFilterResultCta(0)).toBe('查看 0 個版位');
    expect(formatMobileFilterResultCta(8)).toBe('查看 8 個版位');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/mobileFilterSheet.test.ts`

Expected: FAIL because `@/utils/mobileFilterSheet` does not exist.

- [ ] **Step 3: Add minimal helper**

```ts
export function formatMobileFilterResultCta(resultCount: number) {
  return `查看 ${resultCount} 個版位`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/mobileFilterSheet.test.ts`

Expected: PASS.

### Task 2: Rework Mobile Filter Sheet

**Files:**
- Modify: `src/components/campaign-planner/MobileFilterSheet.tsx`
- Modify: `src/components/campaign-planner/CampaignPlannerPage.tsx`

- [ ] **Step 1: Extend `MobileFilterSheetProps`**

Add `resultCount`, `searchQuery`, and `onSearchChange` props.

- [ ] **Step 2: Replace compact tabs with vertical focused sections**

Render a 72dvh modal bottom sheet with dim backdrop, header, search input, selected-filter chips, filter sections, and sticky footer. Keep filters applied in real time.

- [ ] **Step 3: Wire planner state**

Pass `filteredAndSortedInventory.length`, `searchQuery`, and `setSearchQuery` from `CampaignPlannerPage` into `MobileFilterSheet`.

- [ ] **Step 4: Verify**

Run: `npm run test -- src/__tests__/mobileFilterSheet.test.ts`, `npm run lint`, `npm run build`.

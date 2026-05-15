# Creative Requirements & Upload Wizard Design Spec

## Overview

Add a creative requirements system to Step 3 of the campaign planner. The system derives which canonical format(s) an advertiser needs based on their media plan, presents per-format upload zones, validates files client-side (MIME + size), and enables submission once all required formats have assets.

Also includes a test asset generation script that produces correctly-sized placeholder PNG files for each canonical format.

---

## Scope (Hybrid MVP)

- **Frontend**: All logic is client-side mock. No real upload endpoint.
- **Schema spec**: Forward-looking type definitions suitable for backend integration later.
- **Validation**: MIME type + file size only (A-level). No dimension checking.
- **Step 3**: Currently a placeholder — this spec defines its full content.

---

## Canonical Format System

Four canonical formats cover all venue types in the inventory:

Mapped by `InventoryLocation.screenType` (exact string values from mock data):

| Format ID | Label | Dimensions | `screenType` values |
|---|---|---|---|
| `landscape_16_9` | 橫式 16:9 | 1920 × 1080 px | `Billboard`, `Transit`, `Mega Screen` |
| `portrait_9_16` | 直式 9:16 | 1080 × 1920 px | `Kiosk`, `Indoor` |
| `square_1_1` | 方形 1:1 | 1080 × 1080 px | `Street Furniture` |
| `ultra_wide` | 超寬 3:1 | 3840 × 1280 px | *(reserved — no current mock data)* |

Each format accepts: `image/jpeg`, `image/png`, `video/mp4`. Max file size: 50 MB.

---

## Data Types (`src/types/creative.ts`)

```ts
export type CanonicalFormat =
  | 'landscape_16_9'
  | 'portrait_9_16'
  | 'square_1_1'
  | 'ultra_wide';

export interface FormatSpec {
  format: CanonicalFormat;
  label: string;
  dimensions: string;
  aspectRatio: string;
  maxFileSizeMB: number;
  acceptedMimeTypes: string[];
  screenTypes: string[];      // InventoryLocation.screenType values that map to this format
}

export type AssetStatus = 'empty' | 'valid' | 'invalid';

export interface CreativeAsset {
  format: CanonicalFormat;
  file: File;
  previewUrl: string;
  status: AssetStatus;
  errorMessage?: string;
}
```

---

## Utility: `src/utils/creativeRequirements.ts`

Two functions:

**`FORMAT_SPECS: FormatSpec[]`** — constant array of all four format specs (the source of truth for labels, dimensions, accepted types).

**`deriveRequiredFormats(selectedItems: MediaPlanItem[], allInventory: InventoryLocation[]): CanonicalFormat[]`** — looks up each selected inventory item's `screenType`, finds the matching `FormatSpec` via `screenTypes` array, returns deduplicated `CanonicalFormat[]` preserving insertion order. Items with no matching format are skipped.

**`validateAsset(file: File, spec: FormatSpec): { valid: boolean; errorMessage?: string }`** — checks `file.type` is in `spec.acceptedMimeTypes` and `file.size / 1024 / 1024 <= spec.maxFileSizeMB`.

---

## Step 3 Page: `src/components/campaign-planner/CreativeUploadStep.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Step 3: 上傳素材                                        │
│                                                          │
│  你的媒體計劃包含 5 個版位，需要準備 2 種格式的素材      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  橫式 16:9   [3 個版位使用]                      │   │
│  │  1920 × 1080 px  ·  最大 50MB  ·  JPG/PNG/MP4   │   │
│  │                                                  │   │
│  │      [ ↑ 拖曳或點擊上傳 ]                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ✓ 直式 9:16   [2 個版位使用]   × remove        │   │
│  │  ████████████  preview.mp4  ·  12.3 MB           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [ 提交審查 ]  ← disabled until all formats have assets  │
└─────────────────────────────────────────────────────────┘
```

### Upload Zone States

| State | Visual |
|---|---|
| `empty` | Dashed border, upload icon, drag-and-drop hint |
| `valid` | Green border, preview thumbnail (img for image, video poster for mp4), filename + size, remove button |
| `invalid` | Red border, error message (wrong type / too large), retry hint |

### Drag and Drop

Support both click-to-browse and drag-and-drop via a hidden `<input type="file">` and `onDrop` handler on the zone div.

### State Management

Local `useState` in `CreativeUploadStep`: `assets: Record<CanonicalFormat, CreativeAsset | null>` keyed by format. On file drop/select, call `validateAsset`, create object URL for preview, update state.

### Submit Button

Enabled when every required format has a `valid` asset. On click: mock success toast + `onContinue()`.

---

## Test Asset Script: `scripts/generate-test-assets.ts`

Node.js script using the `canvas` npm package. Generates one PNG per canonical format:

| Format | Output file | Canvas size | Background | Label text |
|---|---|---|---|---|
| `landscape_16_9` | `public/test-assets/test-landscape.png` | 1920 × 1080 | `#3b82f6` (blue) | "TEST 橫式 16:9 · 1920×1080" |
| `portrait_9_16` | `public/test-assets/test-portrait.png` | 1080 × 1920 | `#22c55e` (green) | "TEST 直式 9:16 · 1080×1920" |
| `square_1_1` | `public/test-assets/test-square.png` | 1080 × 1080 | `#f97316` (orange) | "TEST 方形 1:1 · 1080×1080" |
| `ultra_wide` | `public/test-assets/test-ultrawide.png` | 3840 × 1280 | `#a855f7` (purple) | "TEST 超寬 3:1 · 3840×1280" |

Each image renders the label centered in white bold text. Script exits 0 on success.

Run once: `npx tsx scripts/generate-test-assets.ts`  
Output files are committed to the repo for immediate use in upload testing.

---

## i18n Keys (add to `src/i18n/dictionaries.ts`)

```
creative.step.title          → "上傳素材" / "Upload Creatives"
creative.step.summary        → "你的媒體計劃包含 {n} 個版位" (rendered manually, no interpolation)
creative.step.formatsNeeded  → "需要準備 {n} 種格式的素材" (rendered manually)
creative.upload.dragDrop     → "拖曳或點擊上傳" / "Drag & drop or click to upload"
creative.upload.remove       → "移除" / "Remove"
creative.upload.venuesCount  → "{n} 個版位使用" (rendered manually)
creative.upload.maxSize      → "最大 {n}MB" (rendered manually)
creative.submit.button       → "提交審查" / "Submit for Review"
creative.submit.success      → "素材已提交，等待審查" / "Submitted for review"
```

Since the i18n system has no interpolation, numeric values are concatenated inline in JSX.

---

## File Map

| Action | Path |
|---|---|
| Create | `src/types/creative.ts` |
| Create | `src/utils/creativeRequirements.ts` |
| Create | `src/components/campaign-planner/CreativeUploadStep.tsx` |
| Create | `scripts/generate-test-assets.ts` |
| Modify | `src/i18n/dictionaries.ts` — add creative keys |
| Modify | `src/components/campaign-planner/CampaignPlannerPage.tsx` — render `CreativeUploadStep` at step 3 |
| Output | `public/test-assets/test-landscape.png` |
| Output | `public/test-assets/test-portrait.png` |
| Output | `public/test-assets/test-square.png` |
| Output | `public/test-assets/test-ultrawide.png` |

---

## Out of Scope

- Real file upload to storage (S3 / Supabase Storage)
- Server-side MIME validation
- Dimension/metadata checking
- Creative approval workflow UI (exists in admin panel separately)
- Video thumbnail extraction

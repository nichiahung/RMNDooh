# Creative Requirements & Upload Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic creative upload UI with a canonical-format-aware upload wizard that derives required formats from the advertiser's media plan and presents one upload zone per format.

**Architecture:** A new `src/types/creative.ts` defines `CanonicalFormat` and `FormatSpec`. A utility `src/utils/creativeRequirements.ts` maps each `InventoryLocation.screenType` to its canonical format and validates uploaded files. `CreativeUploadStep.tsx` is rewritten to render per-format upload zones that call the existing `uploadCreativeAsset` (Supabase) after client-side validation passes. A Node.js script generates test PNG assets using only built-in Node.js modules.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, Vitest, Node.js built-ins (`zlib`, `fs`, `path`)

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/types/creative.ts` | `CanonicalFormat`, `FormatSpec`, `AssetStatus` |
| Create | `src/utils/creativeRequirements.ts` | `FORMAT_SPECS`, `deriveRequiredFormats`, `validateAsset` |
| Create | `src/__tests__/creativeRequirements.test.ts` | Unit tests for utility functions |
| Modify | `src/i18n/dictionaries.ts` | Add 8 new creative upload keys (en + zh-TW) |
| Modify | `src/components/campaign-planner/CreativeUploadStep.tsx` | Full rewrite to format-aware upload zones |
| Create | `scripts/generate-test-assets.ts` | Generates colored PNG test files (no external deps) |
| Output | `public/test-assets/test-landscape.png` | 32×18 blue PNG for landscape_16_9 testing |
| Output | `public/test-assets/test-portrait.png` | 18×32 green PNG for portrait_9_16 testing |
| Output | `public/test-assets/test-square.png` | 24×24 orange PNG for square_1_1 testing |
| Output | `public/test-assets/test-ultrawide.png` | 48×16 purple PNG for ultra_wide testing |

> Note: test assets use small pixel dimensions (correct aspect ratio) so deflate runs fast; MIME type is still `image/png` and size is well under 50 MB — sufficient for upload zone testing.

---

### Task 1: Creative types

**Files:**
- Create: `src/types/creative.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/creative.ts
export type CanonicalFormat =
  | 'landscape_16_9'
  | 'portrait_9_16'
  | 'square_1_1'
  | 'ultra_wide';

export type AssetStatus = 'uploading' | 'valid' | 'invalid';

export interface FormatSpec {
  format: CanonicalFormat;
  label: string;
  dimensions: string;
  aspectRatio: string;
  maxFileSizeMB: number;
  acceptedMimeTypes: string[];
  screenTypes: string[]; // InventoryLocation.screenType values that map here
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/creative.ts
git commit -m "feat: add CanonicalFormat and FormatSpec types"
```

---

### Task 2: Format utility + tests

**Files:**
- Create: `src/utils/creativeRequirements.ts`
- Create: `src/__tests__/creativeRequirements.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/creativeRequirements.test.ts
import { describe, it, expect } from 'vitest';
import {
  FORMAT_SPECS,
  deriveRequiredFormats,
  validateAsset,
} from '@/utils/creativeRequirements';
import type { MediaPlanItem } from '@/types/inventory';

// Minimal mock inventory items
const makePlanItem = (id: string): MediaPlanItem => ({
  inventoryId: id,
  days: 7,
});

const mockInventory = [
  { id: 'a', screenType: 'Billboard' },
  { id: 'b', screenType: 'Kiosk' },
  { id: 'c', screenType: 'Billboard' }, // duplicate format
  { id: 'd', screenType: 'Street Furniture' },
  { id: 'e', screenType: 'UnknownType' },
] as any[];

describe('FORMAT_SPECS', () => {
  it('has exactly 4 entries', () => {
    expect(FORMAT_SPECS).toHaveLength(4);
  });

  it('every spec has non-empty screenTypes', () => {
    FORMAT_SPECS.forEach(spec => {
      expect(spec.screenTypes.length).toBeGreaterThan(0);
    });
  });
});

describe('deriveRequiredFormats', () => {
  it('maps Billboard to landscape_16_9', () => {
    const result = deriveRequiredFormats([makePlanItem('a')], mockInventory);
    expect(result).toEqual(['landscape_16_9']);
  });

  it('maps Kiosk to portrait_9_16', () => {
    const result = deriveRequiredFormats([makePlanItem('b')], mockInventory);
    expect(result).toEqual(['portrait_9_16']);
  });

  it('deduplicates formats when multiple venues share the same format', () => {
    const result = deriveRequiredFormats(
      [makePlanItem('a'), makePlanItem('c')],
      mockInventory,
    );
    expect(result).toEqual(['landscape_16_9']);
  });

  it('returns multiple formats for mixed plan', () => {
    const result = deriveRequiredFormats(
      [makePlanItem('a'), makePlanItem('b'), makePlanItem('d')],
      mockInventory,
    );
    expect(result).toEqual(['landscape_16_9', 'portrait_9_16', 'square_1_1']);
  });

  it('skips venues with unknown screenType', () => {
    const result = deriveRequiredFormats([makePlanItem('e')], mockInventory);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty plan', () => {
    expect(deriveRequiredFormats([], mockInventory)).toEqual([]);
  });
});

describe('validateAsset', () => {
  const landscape = FORMAT_SPECS.find(s => s.format === 'landscape_16_9')!;

  const makeFile = (type: string, sizeMB: number) =>
    new File([new ArrayBuffer(sizeMB * 1024 * 1024)], 'test.png', { type });

  it('accepts valid MIME type and size', () => {
    const result = validateAsset(makeFile('image/png', 1), landscape);
    expect(result.valid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('rejects wrong MIME type', () => {
    const result = validateAsset(makeFile('image/gif', 1), landscape);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/type/i);
  });

  it('rejects oversized file', () => {
    const result = validateAsset(makeFile('image/png', 51), landscape);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/50\s*MB/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/creativeRequirements.test.ts`
Expected: FAIL — `Cannot find module '@/utils/creativeRequirements'`

- [ ] **Step 3: Implement the utility**

```ts
// src/utils/creativeRequirements.ts
import type { CanonicalFormat, FormatSpec } from '@/types/creative';
import type { MediaPlanItem, InventoryLocation } from '@/types/inventory';

export const FORMAT_SPECS: FormatSpec[] = [
  {
    format: 'landscape_16_9',
    label: '橫式 16:9',
    dimensions: '1920 × 1080 px',
    aspectRatio: '16:9',
    maxFileSizeMB: 50,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    screenTypes: ['Billboard', 'Transit', 'Mega Screen'],
  },
  {
    format: 'portrait_9_16',
    label: '直式 9:16',
    dimensions: '1080 × 1920 px',
    aspectRatio: '9:16',
    maxFileSizeMB: 50,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    screenTypes: ['Kiosk', 'Indoor'],
  },
  {
    format: 'square_1_1',
    label: '方形 1:1',
    dimensions: '1080 × 1080 px',
    aspectRatio: '1:1',
    maxFileSizeMB: 50,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    screenTypes: ['Street Furniture'],
  },
  {
    format: 'ultra_wide',
    label: '超寬 3:1',
    dimensions: '3840 × 1280 px',
    aspectRatio: '3:1',
    maxFileSizeMB: 50,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    screenTypes: [],
  },
];

export function deriveRequiredFormats(
  selectedItems: MediaPlanItem[],
  allInventory: Pick<InventoryLocation, 'id' | 'screenType'>[],
): CanonicalFormat[] {
  const seen = new Set<CanonicalFormat>();
  const result: CanonicalFormat[] = [];

  for (const item of selectedItems) {
    const venue = allInventory.find(v => v.id === item.inventoryId);
    if (!venue) continue;
    const spec = FORMAT_SPECS.find(s => s.screenTypes.includes(venue.screenType));
    if (!spec || seen.has(spec.format)) continue;
    seen.add(spec.format);
    result.push(spec.format);
  }

  return result;
}

export function validateAsset(
  file: File,
  spec: FormatSpec,
): { valid: boolean; errorMessage?: string } {
  if (!spec.acceptedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      errorMessage: `不支援的檔案類型 (${file.type})。請上傳 JPG、PNG 或 MP4。`,
    };
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > spec.maxFileSizeMB) {
    return {
      valid: false,
      errorMessage: `檔案超過 ${spec.maxFileSizeMB} MB 上限（目前 ${sizeMB.toFixed(1)} MB）。`,
    };
  }
  return { valid: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/creativeRequirements.test.ts`
Expected: PASS — all 10 tests green

- [ ] **Step 5: Commit**

```bash
git add src/utils/creativeRequirements.ts src/__tests__/creativeRequirements.test.ts
git commit -m "feat: add canonical format specs and deriveRequiredFormats utility"
```

---

### Task 3: i18n keys

**Files:**
- Modify: `src/i18n/dictionaries.ts`

Context: The file has a large `en` dictionary and a `zh-TW` dictionary. Keys are plain string literals, no interpolation — numeric values are concatenated inline in JSX. Add 8 new keys to both dictionaries. Find the `// Creative Upload` comment block (around line 64 in `en`, mirrored in `zh-TW`) and append after the last `creative.*` key in each section.

- [ ] **Step 1: Add keys to `en` dictionary**

After the last `creative.req.*` key in the `en` block, insert:

```ts
    'creative.upload.dragDrop': 'Drag & drop or click to upload',
    'creative.upload.remove': 'Remove',
    'creative.upload.venuesCount': 'venues use this format',
    'creative.upload.maxSize': 'Max',
    'creative.upload.uploading': 'Uploading…',
    'creative.upload.formatsNeeded': 'formats required',
    'creative.submit.button': 'Submit for Review',
    'creative.submit.success': 'Submitted for review',
```

- [ ] **Step 2: Add keys to `zh-TW` dictionary**

After the last `creative.req.*` key in the `zh-TW` block, insert:

```ts
    'creative.upload.dragDrop': '拖曳或點擊上傳',
    'creative.upload.remove': '移除',
    'creative.upload.venuesCount': '個版位使用此格式',
    'creative.upload.maxSize': '最大',
    'creative.upload.uploading': '上傳中…',
    'creative.upload.formatsNeeded': '種格式',
    'creative.submit.button': '提交審查',
    'creative.submit.success': '素材已提交，等待審查',
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/i18n/dictionaries.ts
git commit -m "feat: add creative upload zone i18n keys"
```

---

### Task 4: Rewrite CreativeUploadStep

**Files:**
- Modify: `src/components/campaign-planner/CreativeUploadStep.tsx`

Context: The existing file has a generic single-zone upload. The new version replaces the main content area with one upload card per required canonical format. It keeps the same Props interface (same parent wiring in `CampaignPlannerPage.tsx`) and still calls `uploadCreativeAsset` from `@/lib/api/creatives` for each file. On "Submit for Review", it calls `setCreatives(uploadedAssets)` then `onContinue()`.

`handleContinueToReview` in `CampaignPlannerPage` checks `creatives.length > 0` before transitioning — so `setCreatives` must be called first.

- [ ] **Step 1: Replace the file with the new implementation**

```tsx
// src/components/campaign-planner/CreativeUploadStep.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import { CreativeAsset, MediaPlanItem, InventoryLocation } from '@/types/inventory';
import { CanonicalFormat, FormatSpec, AssetStatus } from '@/types/creative';
import { FORMAT_SPECS, deriveRequiredFormats, validateAsset } from '@/utils/creativeRequirements';
import { uploadCreativeAsset } from '@/lib/api/creatives';
import { ArrowLeft, UploadCloud, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  creatives: CreativeAsset[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeAsset[]>>;
  onBack: () => void;
  onContinue: () => void;
}

type ZoneState = {
  status: AssetStatus;
  file: File;
  previewUrl: string;
  errorMessage?: string;
  asset?: CreativeAsset;
};

export function CreativeUploadStep({
  selectedItems,
  allInventory,
  setCreatives,
  onBack,
  onContinue,
}: Props) {
  const { t } = useI18n();
  const requiredFormats = deriveRequiredFormats(selectedItems, allInventory);
  const [zones, setZones] = useState<Partial<Record<CanonicalFormat, ZoneState>>>({});

  const venueCountForFormat = (format: CanonicalFormat): number => {
    const spec = FORMAT_SPECS.find(s => s.format === format)!;
    return selectedItems.filter(item => {
      const venue = allInventory.find(v => v.id === item.inventoryId);
      return venue && spec.screenTypes.includes(venue.screenType);
    }).length;
  };

  const handleFile = useCallback(async (format: CanonicalFormat, spec: FormatSpec, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const validation = validateAsset(file, spec);

    if (!validation.valid) {
      setZones(prev => ({
        ...prev,
        [format]: { status: 'invalid', file, previewUrl, errorMessage: validation.errorMessage },
      }));
      return;
    }

    setZones(prev => ({ ...prev, [format]: { status: 'uploading', file, previewUrl } }));

    try {
      const asset = await uploadCreativeAsset(file);
      setZones(prev => ({ ...prev, [format]: { status: 'valid', file, previewUrl, asset } }));
    } catch (err) {
      setZones(prev => ({
        ...prev,
        [format]: {
          status: 'invalid',
          file,
          previewUrl,
          errorMessage: err instanceof Error ? err.message : '上傳失敗，請再試一次',
        },
      }));
    }
  }, []);

  const handleRemove = (format: CanonicalFormat) => {
    setZones(prev => {
      const next = { ...prev };
      const zone = next[format];
      if (zone) URL.revokeObjectURL(zone.previewUrl);
      delete next[format];
      return next;
    });
  };

  const allDone = requiredFormats.length > 0 &&
    requiredFormats.every(f => zones[f]?.status === 'valid');

  const handleSubmit = () => {
    const assets = requiredFormats
      .map(f => zones[f]?.asset)
      .filter((a): a is CreativeAsset => !!a);
    setCreatives(assets);
    onContinue();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{t('creative.title')}</h2>
          <p className="text-slate-500 mt-1">
            {t('creative.subtitle')} · {selectedItems.length} 個版位，需要{' '}
            <span className="font-semibold text-indigo-600">{requiredFormats.length}</span>{' '}
            {t('creative.upload.formatsNeeded')}
          </p>
        </div>

        {/* Format Upload Zones */}
        {requiredFormats.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            尚未選擇任何版位
          </div>
        ) : (
          <div className="space-y-4">
            {requiredFormats.map(format => {
              const spec = FORMAT_SPECS.find(s => s.format === format)!;
              return (
                <FormatUploadZone
                  key={format}
                  spec={spec}
                  venueCount={venueCountForFormat(format)}
                  state={zones[format] ?? null}
                  onFile={file => handleFile(format, spec, file)}
                  onRemove={() => handleRemove(format)}
                  t={t}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('creative.backToInventory')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allDone}
            className="flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('creative.submit.button')}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FormatUploadZone sub-component
// ─────────────────────────────────────────────

interface ZoneProps {
  spec: FormatSpec;
  venueCount: number;
  state: ZoneState | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  t: (key: string) => string;
}

function FormatUploadZone({ spec, venueCount, state, onFile, onRemove, t }: ZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const borderColor =
    state?.status === 'valid' ? 'border-emerald-400 bg-emerald-50/30' :
    state?.status === 'invalid' ? 'border-red-400 bg-red-50/30' :
    isDragging ? 'border-indigo-400 bg-indigo-50/30' :
    'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20';

  return (
    <div className={`rounded-xl border-2 transition-colors ${state ? borderColor : `border-dashed ${borderColor}`}`}>
      {/* Zone Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            {state?.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {state?.status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {state?.status === 'uploading' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
            <span className="font-semibold text-slate-900 text-sm">{spec.label}</span>
            <span className="text-xs text-slate-400 font-normal">{spec.aspectRatio}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {spec.dimensions} · {t('creative.upload.maxSize')} {spec.maxFileSizeMB}MB · JPG/PNG/MP4
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {venueCount} {t('creative.upload.venuesCount')}
        </span>
      </div>

      {/* Zone Body */}
      <div className="p-4">
        {!state ? (
          <div
            className="flex flex-col items-center justify-center py-8 cursor-pointer"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={spec.acceptedMimeTypes.join(',')}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
            />
            <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">{t('creative.upload.dragDrop')}</p>
          </div>
        ) : state.status === 'uploading' ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
            <span className="text-sm text-slate-600">{t('creative.upload.uploading')}</span>
            <span className="text-xs text-slate-400 truncate">{state.file.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Preview */}
            {state.file.type.startsWith('image/') ? (
              <img
                src={state.previewUrl}
                alt={state.file.name}
                className="w-20 h-12 object-cover rounded border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-slate-500 font-medium">MP4</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{state.file.name}</p>
              {state.status === 'invalid' && state.errorMessage && (
                <p className="text-xs text-red-600 mt-0.5">{state.errorMessage}</p>
              )}
              {state.status === 'valid' && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {(state.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              title={t('creative.upload.remove')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Start dev server and test the upload flow manually**

Run: `npm run dev`

Open `http://localhost:3000`, navigate to the campaign planner, add items to the media plan with different screen types (Billboard + Kiosk), click "Continue to Creative Upload". Verify:
- You see 2 upload zones: "橫式 16:9" and "直式 9:16"
- Each zone shows correct dimensions and venue count
- Dragging/clicking opens file picker
- Uploading an MP4 shows spinner then preview
- Submit button is disabled until all zones have valid assets
- After submit, review step loads

- [ ] **Step 4: Commit**

```bash
git add src/components/campaign-planner/CreativeUploadStep.tsx
git commit -m "feat: rewrite CreativeUploadStep with per-format canonical upload zones"
```

---

### Task 5: Test asset script + generate files

**Files:**
- Create: `scripts/generate-test-assets.ts`
- Output: `public/test-assets/*.png`

Context: Uses only Node.js built-ins (`zlib.deflateSync`, `fs`, `path`). Implements CRC32 inline (required by PNG format). Generates small PNGs (correct aspect ratios, solid colors) for manual upload testing.

- [ ] **Step 1: Create the script**

```ts
// scripts/generate-test-assets.ts
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// CRC32 implementation (required by PNG spec)
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcBytes]);
}

function makePNG(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB (no alpha)

  // Raw scanlines: [filter=0, r, g, b, r, g, b, ...]
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[y * rowSize + 1 + x * 3] = r;
      raw[y * rowSize + 1 + x * 3 + 1] = g;
      raw[y * rowSize + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(process.cwd(), 'public', 'test-assets');
mkdirSync(outDir, { recursive: true });

const assets: Array<{ file: string; w: number; h: number; r: number; g: number; b: number; label: string }> = [
  { file: 'test-landscape.png', w: 32,  h: 18,  r: 59,  g: 130, b: 246, label: 'landscape_16_9 (32×18)' },
  { file: 'test-portrait.png',  w: 18,  h: 32,  r: 34,  g: 197, b: 94,  label: 'portrait_9_16 (18×32)'  },
  { file: 'test-square.png',    w: 24,  h: 24,  r: 249, g: 115, b: 22,  label: 'square_1_1 (24×24)'     },
  { file: 'test-ultrawide.png', w: 48,  h: 16,  r: 168, g: 85,  b: 247, label: 'ultra_wide (48×16)'     },
];

for (const { file, w, h, r, g, b, label } of assets) {
  const png = makePNG(w, h, r, g, b);
  const outPath = join(outDir, file);
  writeFileSync(outPath, png);
  console.log(`✓ ${label} → public/test-assets/${file} (${png.length} bytes)`);
}

console.log('\nTest assets generated. Use them to test the upload zones in the campaign planner.');
```

- [ ] **Step 2: Run the script**

Run: `npx tsx scripts/generate-test-assets.ts`

Expected output:
```
✓ landscape_16_9 (32×18) → public/test-assets/test-landscape.png (...)
✓ portrait_9_16 (18×32) → public/test-assets/test-portrait.png (...)
✓ square_1_1 (24×24) → public/test-assets/test-square.png (...)
✓ ultra_wide (48×16) → public/test-assets/test-ultrawide.png (...)

Test assets generated. ...
```

If `tsx` is not available globally, run: `./node_modules/.bin/tsx scripts/generate-test-assets.ts`

- [ ] **Step 3: Verify files exist and are valid PNGs**

Run: `ls -lh public/test-assets/ && file public/test-assets/*.png`

Expected: four files, each identified as `PNG image data`.

- [ ] **Step 4: Commit everything**

```bash
git add scripts/generate-test-assets.ts public/test-assets/
git commit -m "feat: add test asset generator script and pre-generated PNG test assets"
```

---

## Final verification

Run the full test suite: `npx vitest run`

Expected: all tests pass including the new `creativeRequirements.test.ts`.

Open the dev server and test the golden path:
1. Select inventory items with mixed screen types (e.g. Billboard + Kiosk)
2. Click "Continue to Creative Upload"
3. Upload `test-landscape.png` to the 橫式 16:9 zone
4. Upload `test-portrait.png` to the 直式 9:16 zone
5. Verify submit button enables
6. Click "提交審查" — verify review step loads with creatives

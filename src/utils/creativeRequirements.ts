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

export interface GroupedCreativeRequirement {
  format: CanonicalFormat;
  label: string;
  dimensions: string;
  acceptedMimeTypes: string[];
  maxFileSizeMB: number;
  locationCount: number;
  locationNames: string[];
}

/** Returns one entry per distinct format, with location count for each. */
export function deriveGroupedRequirements(
  selectedItems: MediaPlanItem[],
  allInventory: InventoryLocation[],
): GroupedCreativeRequirement[] {
  const groups = new Map<CanonicalFormat, GroupedCreativeRequirement>();

  for (const item of selectedItems) {
    const venue = allInventory.find(v => v.id === item.inventoryId);
    if (!venue) continue;
    const spec = FORMAT_SPECS.find(s => s.screenTypes.includes(venue.screenType));
    if (!spec) continue;

    if (!groups.has(spec.format)) {
      groups.set(spec.format, {
        format: spec.format,
        label: spec.label,
        dimensions: spec.dimensions,
        acceptedMimeTypes: spec.acceptedMimeTypes,
        maxFileSizeMB: spec.maxFileSizeMB,
        locationCount: 0,
        locationNames: [],
      });
    }
    const group = groups.get(spec.format)!;
    group.locationCount++;
    group.locationNames.push(venue.name);
  }

  return Array.from(groups.values());
}

/** Returns the compact dimension label (e.g. "1920×1080") for a given screenType. */
export function getSpecChip(screenType: string): string | null {
  const spec = FORMAT_SPECS.find(s => s.screenTypes.includes(screenType));
  if (!spec) return null;
  // e.g. "1920 × 1080 px" → "1920×1080"
  return spec.dimensions.replace(/\s/g, '').replace('px', '');
}

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

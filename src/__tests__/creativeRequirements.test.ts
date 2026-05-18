import { describe, it, expect } from 'vitest';
import {
  FORMAT_SPECS,
  deriveRequiredFormats,
  validateAsset,
} from '@/utils/creativeRequirements';
import type { InventoryLocation, MediaPlanItem } from '@/types/inventory';

const makePlanItem = (id: string): MediaPlanItem => ({
  inventoryId: id,
  days: 7,
});

const mockInventory = [
  { id: 'a', screenType: 'Billboard' },
  { id: 'b', screenType: 'Kiosk' },
  { id: 'c', screenType: 'Billboard' },
  { id: 'd', screenType: 'Street Furniture' },
  { id: 'e', screenType: 'UnknownType' },
] as Pick<InventoryLocation, 'id' | 'screenType'>[];

describe('FORMAT_SPECS', () => {
  it('has exactly 4 entries', () => {
    expect(FORMAT_SPECS).toHaveLength(4);
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
    expect(result.errorMessage).toMatch(/類型/);
  });

  it('rejects oversized file', () => {
    const result = validateAsset(makeFile('image/png', 51), landscape);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/50\s*MB/i);
  });
});

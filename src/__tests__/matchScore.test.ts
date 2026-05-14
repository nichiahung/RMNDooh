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

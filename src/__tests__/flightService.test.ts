import { describe, it, expect } from 'vitest';
import {
  calculateInclusiveDays,
  calculateDateMatchStatus,
  compareCampaignFlightToLineItem,
  summarizeMixedFlight,
  calculateCreativeDueAt,
} from '@/lib/services/flightService';

describe('flightService', () => {
  describe('calculateInclusiveDays', () => {
    it('2026-05-24 to 2026-05-31 returns 8 inclusive days', () => {
      expect(calculateInclusiveDays('2026-05-24', '2026-05-31')).toBe(8);
    });

    it('same day returns 1', () => {
      expect(calculateInclusiveDays('2026-05-24', '2026-05-24')).toBe(1);
    });

    it('null start returns 0', () => {
      expect(calculateInclusiveDays(null, '2026-05-31')).toBe(0);
    });

    it('null end returns 0', () => {
      expect(calculateInclusiveDays('2026-05-24', null)).toBe(0);
    });

    it('end before start returns 0', () => {
      expect(calculateInclusiveDays('2026-05-31', '2026-05-24')).toBe(0);
    });
  });

  describe('calculateDateMatchStatus', () => {
    it('full match when line item covers entire campaign', () => {
      expect(calculateDateMatchStatus('2026-05-24', '2026-05-31', '2026-05-24', '2026-05-31')).toBe('full_match');
    });

    it('full match when line item is wider than campaign', () => {
      expect(calculateDateMatchStatus('2026-05-24', '2026-05-31', '2026-05-20', '2026-06-05')).toBe('full_match');
    });

    it('partial match when line item overlaps partially', () => {
      expect(calculateDateMatchStatus('2026-05-24', '2026-05-31', '2026-05-26', '2026-05-30')).toBe('partial_match');
    });

    it('no match when no overlap', () => {
      expect(calculateDateMatchStatus('2026-05-24', '2026-05-31', '2026-05-18', '2026-05-19')).toBe('no_match');
    });

    it('no match when null dates', () => {
      expect(calculateDateMatchStatus('2026-05-24', '2026-05-31', null, null)).toBe('no_match');
    });
  });

  describe('compareCampaignFlightToLineItem', () => {
    it('full match returns correct overlap days', () => {
      const result = compareCampaignFlightToLineItem('2026-05-24', '2026-05-31', '2026-05-24', '2026-05-31');
      expect(result.status).toBe('full_match');
      expect(result.overlapDays).toBe(8);
      expect(result.campaignDays).toBe(8);
      expect(result.lineItemDays).toBe(8);
    });

    it('partial match returns correct overlap', () => {
      const result = compareCampaignFlightToLineItem('2026-05-24', '2026-05-31', '2026-05-26', '2026-05-30');
      expect(result.status).toBe('partial_match');
      expect(result.overlapDays).toBe(5);
    });

    it('no overlap returns 0', () => {
      const result = compareCampaignFlightToLineItem('2026-05-24', '2026-05-31', '2026-05-18', '2026-05-19');
      expect(result.status).toBe('no_match');
      expect(result.overlapDays).toBe(0);
    });
  });

  describe('summarizeMixedFlight', () => {
    it('counts full, partial, no match correctly', () => {
      const items = [
        { dateMatchStatus: 'full_match' as const },
        { dateMatchStatus: 'partial_match' as const },
        { dateMatchStatus: 'partial_match' as const },
        { dateMatchStatus: 'no_match' as const },
      ];
      const result = summarizeMixedFlight(items);
      expect(result.fullMatch).toBe(1);
      expect(result.partialMatch).toBe(2);
      expect(result.noMatch).toBe(1);
      expect(result.total).toBe(4);
    });
  });

  describe('calculateCreativeDueAt', () => {
    it('returns date 96h before earliest playback', () => {
      const due = calculateCreativeDueAt('2026-05-24T08:00:00Z');
      expect(due).toBe('2026-05-20T08:00:00.000Z');
    });

    it('returns null for null input', () => {
      expect(calculateCreativeDueAt(null)).toBeNull();
    });

    it('respects custom SLA hours', () => {
      const due = calculateCreativeDueAt('2026-05-24T08:00:00Z', 48);
      expect(due).toBe('2026-05-22T08:00:00.000Z');
    });
  });
});

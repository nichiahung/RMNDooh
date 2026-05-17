import { describe, it, expect } from 'vitest';
import {
  calculateSelfServicePrice,
  calculateProposalPrice,
  requiresPricingApproval,
  checkFloorPrice,
  createPricingSnapshot,
  sanitizePricingForAdvertiser,
  selectPriceBook,
} from '@/lib/services/pricingService';

describe('pricingService', () => {
  describe('calculateSelfServicePrice', () => {
    it('uses self_service_msrp price book', () => {
      const result = calculateSelfServicePrice([
        { inventoryId: 'inv-tpe-101', days: 8, inventoryIdDailyPrice: 15000 },
      ]);
      expect(result.appliedPricingBook.priceBookType).toBe('self_service_msrp');
      expect(result.listPriceTotal).toBe(120000);
      expect(result.finalQuote).toBe(120000);
      expect(result.requiresApproval).toBe(false);
    });

    it('returns 0 for empty inventory', () => {
      const result = calculateSelfServicePrice([]);
      expect(result.listPriceTotal).toBe(0);
      expect(result.finalQuote).toBe(0);
    });
  });

  describe('calculateProposalPrice', () => {
    it('can apply discount', () => {
      const result = calculateProposalPrice({
        advertiserId: 'adv-01',
        selectedInventory: [
          { inventoryId: 'inv-tpe-101', days: 8, inventoryIdDailyPrice: 18000 },
        ],
        discountPercent: 10,
        manualAdjustment: 0,
      });
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBeLessThan(0);
      expect(result.finalQuote).toBeLessThan(result.listPriceTotal);
    });
  });

  describe('requiresPricingApproval', () => {
    it('requires approval when below floor price', () => {
      expect(requiresPricingApproval({
        finalQuote: 20000,
        floorPrice: 25000,
        discountPercent: 0,
        requestedByUserRole: 'sales',
        bookingSource: 'proposal',
      })).toBe(true);
    });

    it('does not require approval when above floor', () => {
      expect(requiresPricingApproval({
        finalQuote: 30000,
        floorPrice: 25000,
        discountPercent: 0,
        requestedByUserRole: 'sales',
        bookingSource: 'proposal',
      })).toBe(false);
    });

    it('does not require approval when floor is null', () => {
      expect(requiresPricingApproval({
        finalQuote: 10000,
        floorPrice: null,
        discountPercent: 0,
        requestedByUserRole: 'sales',
        bookingSource: 'proposal',
      })).toBe(false);
    });
  });

  describe('checkFloorPrice', () => {
    it('passes when above floor', () => {
      expect(checkFloorPrice({ finalQuote: 30000, floorPrice: 25000 })).toBe(true);
    });

    it('fails when below floor', () => {
      expect(checkFloorPrice({ finalQuote: 20000, floorPrice: 25000 })).toBe(false);
    });

    it('passes when floor is null', () => {
      expect(checkFloorPrice({ finalQuote: 10000, floorPrice: null })).toBe(true);
    });
  });

  describe('createPricingSnapshot', () => {
    it('creates immutable snapshot', () => {
      const book = selectPriceBook({ buyingMethod: 'self_service', advertiserId: 'adv-01' });
      const snapshot = createPricingSnapshot({
        sourceType: 'campaign_draft', sourceId: 'draft-1',
        priceBook: book, listPriceTotal: 100000,
        discountAmount: 0, manualAdjustment: 0, finalQuote: 100000,
        approvalStatus: 'not_required',
      });
      expect(snapshot.id).toBeTruthy();
      expect(snapshot.finalQuote).toBe(100000);
      expect(snapshot.sourceType).toBe('campaign_draft');
    });
  });

  describe('sanitizePricingForAdvertiser', () => {
    it('does not expose floor price or internal fields', () => {
      const book = selectPriceBook({ buyingMethod: 'self_service', advertiserId: 'adv-01' });
      const snapshot = createPricingSnapshot({
        sourceType: 'proposal', sourceId: 'prop-1',
        priceBook: book, listPriceTotal: 100000,
        discountAmount: -5000, manualAdjustment: 0, finalQuote: 95000,
        approvalStatus: 'approved',
      });
      const sanitized = sanitizePricingForAdvertiser(snapshot);
      expect(sanitized.finalQuote).toBe(95000);
      // Should not have these fields
      expect('listPriceTotal' in sanitized).toBe(false);
      expect('salesPriceTotal' in sanitized).toBe(false);
      expect('vipPriceTotal' in sanitized).toBe(false);
      expect('approvalStatus' in sanitized).toBe(false);
      expect('pricingRuleResults' in sanitized).toBe(false);
    });
  });
});

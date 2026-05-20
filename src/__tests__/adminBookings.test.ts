import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetTradingIterationState,
  confirmProposalBooking,
  confirmBookingAction,
  markPaymentCleared,
  cancelBookingAction,
} from '@/lib/tradingIterationActions';

// prop-vip-partnership is 'approved_by_advertiser' in seed data — suitable for confirmProposalBooking
const PROPOSAL_ID = 'prop-vip-partnership';

async function createSeedBooking(): Promise<string> {
  const result = await confirmProposalBooking(PROPOSAL_ID);
  if (!result) throw new Error('Failed to create seed booking');
  return result.bookingId;
}

beforeEach(async () => {
  await resetTradingIterationState();
});

describe('confirmBookingAction', () => {
  it('sets bookingStatus to confirmed', async () => {
    const bookingId = await createSeedBooking();
    // Temporarily set status to inventory_reserved to test confirm
    const { bookings: before } = await cancelBookingAction(bookingId);
    void before; // just to advance state — we'll use a fresh booking
    // Reset and create a booking, then directly test confirmBookingAction
    await resetTradingIterationState();
    const freshId = await createSeedBooking();
    const { bookings } = await confirmBookingAction(freshId);
    const updated = bookings.find(b => b.id === freshId);
    expect(updated?.bookingStatus).toBe('confirmed');
  });

  it('throws when booking id does not exist', async () => {
    await expect(confirmBookingAction('nonexistent-booking-xyz')).rejects.toThrow(
      'Booking nonexistent-booking-xyz not found',
    );
  });
});

describe('markPaymentCleared', () => {
  it('sets paymentCleared to true', async () => {
    const bookingId = await createSeedBooking();
    const { bookings } = await markPaymentCleared(bookingId);
    const updated = bookings.find(b => b.id === bookingId);
    expect(updated?.paymentCleared).toBe(true);
  });

  it('throws when booking id does not exist', async () => {
    await expect(markPaymentCleared('nonexistent-booking-xyz')).rejects.toThrow(
      'Booking nonexistent-booking-xyz not found',
    );
  });
});

describe('cancelBookingAction', () => {
  it('sets bookingStatus to cancelled', async () => {
    const bookingId = await createSeedBooking();
    const { bookings } = await cancelBookingAction(bookingId);
    const updated = bookings.find(b => b.id === bookingId);
    expect(updated?.bookingStatus).toBe('cancelled');
  });

  it('throws when booking id does not exist', async () => {
    await expect(cancelBookingAction('nonexistent-booking-xyz')).rejects.toThrow(
      'Booking nonexistent-booking-xyz not found',
    );
  });
});

import { describe, it, expect } from 'vitest';
import { getWorkQueueNavTarget } from '@/utils/adminWorkQueueNav';

describe('getWorkQueueNavTarget', () => {
  it('routes needsSalesAction to proposals tab', () => {
    const result = getWorkQueueNavTarget('needsSalesAction');
    expect(result.tab).toBe('proposals');
    expect(result.filter).toBe('change_requested');
  });

  it('routes needsBookingAction to bookings tab', () => {
    const result = getWorkQueueNavTarget('needsBookingAction');
    expect(result.tab).toBe('bookings');
    expect(result.filter).toBe('inventory_reserved');
  });

  it('routes needsCreativeReview to creative tab', () => {
    const result = getWorkQueueNavTarget('needsCreativeReview');
    expect(result.tab).toBe('creative');
    expect(result.filter).toBe('pending_review');
  });

  it('routes needsCreativeCoverage to launch-readiness tab', () => {
    const result = getWorkQueueNavTarget('needsCreativeCoverage');
    expect(result.tab).toBe('launch-readiness');
    expect(result.filter).toBe('blocked_by_creative');
  });

  it('routes needsLaunchAction to launch-readiness tab', () => {
    const result = getWorkQueueNavTarget('needsLaunchAction');
    expect(result.tab).toBe('launch-readiness');
    expect(result.filter).toBe('ready_for_launch');
  });
});

import { describe, it, expect } from 'vitest';
import { computeSidebarBadges } from '@/utils/adminSidebarBadges';

describe('computeSidebarBadges', () => {
  const q = {
    needsSalesAction: 2,
    needsBookingAction: 1,
    needsCreativeReview: 3,
    needsCreativeCoverage: 0,
    needsLaunchAction: 2,
  };

  it('sums all queues for overview badge', () => {
    expect(computeSidebarBadges(q).overview).toBe(8);
  });

  it('maps proposals badge to needsSalesAction', () => {
    expect(computeSidebarBadges(q).proposals).toBe(2);
  });

  it('maps bookings badge to needsBookingAction', () => {
    expect(computeSidebarBadges(q).bookings).toBe(1);
  });

  it('maps creative badge to needsCreativeReview', () => {
    expect(computeSidebarBadges(q).creative).toBe(3);
  });

  it('sums coverage + launch action for launch-readiness badge', () => {
    expect(computeSidebarBadges(q)['launch-readiness']).toBe(2);
  });

  it('returns zero badges when all queues are empty', () => {
    const empty = { needsSalesAction: 0, needsBookingAction: 0, needsCreativeReview: 0, needsCreativeCoverage: 0, needsLaunchAction: 0 };
    const badges = computeSidebarBadges(empty);
    expect(badges.overview).toBe(0);
    expect(badges.proposals).toBe(0);
    expect(badges['launch-readiness']).toBe(0);
  });
});

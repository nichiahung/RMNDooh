export interface WorkQueues {
  needsSalesAction: number;
  needsBookingAction: number;
  needsCreativeReview: number;
  needsCreativeCoverage: number;
  needsLaunchAction: number;
}

export interface SidebarBadges {
  overview: number;
  proposals: number;
  bookings: number;
  creative: number;
  'launch-readiness': number;
}

export function computeSidebarBadges(q: WorkQueues): SidebarBadges {
  return {
    overview: q.needsSalesAction + q.needsBookingAction + q.needsCreativeReview + q.needsCreativeCoverage + q.needsLaunchAction,
    proposals: q.needsSalesAction,
    bookings: q.needsBookingAction,
    creative: q.needsCreativeReview,
    'launch-readiness': q.needsCreativeCoverage + q.needsLaunchAction,
  };
}

import type { AdminTab } from '@/components/admin/AdminSidebar';

export type WorkQueueKey =
  | 'needsSalesAction'
  | 'needsBookingAction'
  | 'needsCreativeReview'
  | 'needsCreativeCoverage'
  | 'needsLaunchAction';

export interface WorkQueueNavTarget {
  tab: AdminTab;
  filter: string;
}

const NAV_MAP: Record<WorkQueueKey, WorkQueueNavTarget> = {
  needsSalesAction:      { tab: 'proposals',        filter: 'change_requested' },
  needsBookingAction:    { tab: 'bookings',          filter: 'inventory_reserved' },
  needsCreativeReview:   { tab: 'creative',          filter: 'pending_review' },
  needsCreativeCoverage: { tab: 'launch-readiness',  filter: 'blocked_by_creative' },
  needsLaunchAction:     { tab: 'launch-readiness',  filter: 'ready_for_launch' },
};

export function getWorkQueueNavTarget(key: WorkQueueKey): WorkQueueNavTarget {
  return NAV_MAP[key];
}

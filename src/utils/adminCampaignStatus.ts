export function deriveCampaignCreativeStatus(
  assetStatuses: string[],
  storedStatus: string | null | undefined,
): string {
  if (assetStatuses.length === 0) return storedStatus ?? 'not_submitted';

  if (assetStatuses.some(status => status === 'approved' || status === 'approved_with_restrictions')) {
    return 'approved';
  }

  if (
    assetStatuses.some(status =>
      ['pending_review', 'pending_media_owner_review', 'submitted', 'technical_check_passed'].includes(status)
    )
  ) {
    return 'pending_review';
  }

  if (assetStatuses.every(status => status === 'rejected')) {
    return 'rejected';
  }

  return storedStatus ?? 'not_submitted';
}

export function deriveLaunchReadinessStatus(
  bookingStatus: string | null | undefined,
  creativeStatus: string | null | undefined,
  storedStatus: string | null | undefined,
): string {
  if (creativeStatus === 'rejected') return 'blocked_by_creative';
  if (bookingStatus === 'pending_confirmation' && creativeStatus === 'approved') return 'ready_for_confirmation';
  if (bookingStatus === 'confirmed' && creativeStatus === 'approved') return 'ready_for_scheduling';
  return storedStatus ?? 'not_ready';
}

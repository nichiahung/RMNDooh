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

export interface CampaignFinancialItemSnapshot {
  days?: number | string | null;
  price_per_day?: number | string | null;
  daily_impressions?: number | string | null;
}

export function deriveCampaignFinancials(
  items: CampaignFinancialItemSnapshot[],
  storedBudget: number | string | null | undefined,
  storedImpressions: number | string | null | undefined,
): { estimatedBudget: number; estimatedImpressions: number } {
  const itemBudget = items.reduce(
    (sum, item) => sum + Number(item.price_per_day ?? 0) * Number(item.days ?? 0),
    0,
  );
  const itemImpressions = items.reduce(
    (sum, item) => sum + Number(item.daily_impressions ?? 0) * Number(item.days ?? 0),
    0,
  );

  const campaignBudget = Number(storedBudget ?? 0);
  const campaignImpressions = Number(storedImpressions ?? 0);

  return {
    estimatedBudget: campaignBudget > 0 ? campaignBudget : itemBudget,
    estimatedImpressions: campaignImpressions > 0 ? campaignImpressions : itemImpressions,
  };
}

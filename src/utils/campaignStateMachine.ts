import type {
  CampaignDraftStatus,
  CampaignCreativeRequirement,
  LaunchReadiness,
} from '@/types/campaign-draft';

export function canSubmitCreatives(status: CampaignDraftStatus): boolean {
  return status === 'draft' || status === 'blocked_by_creative';
}

export function computeLaunchReadiness(
  inventoryItemCount: number,
  requirements: CampaignCreativeRequirement[],
): LaunchReadiness {
  const hasInventory = inventoryItemCount > 0;
  const allCreativesApproved =
    requirements.length > 0 &&
    requirements.every(r => r.status === 'approved');

  return {
    ready: hasInventory && allCreativesApproved,
    checks: { hasInventory, allCreativesApproved },
  };
}

export function shouldAutoTransitionToReview(
  currentStatus: CampaignDraftStatus,
  requirements: CampaignCreativeRequirement[],
): boolean {
  if (currentStatus !== 'blocked_by_creative') return false;
  if (requirements.length === 0) return false;
  return requirements.every(r => r.status === 'uploaded' || r.status === 'approved');
}

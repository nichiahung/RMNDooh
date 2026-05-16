/**
 * Creative Requirements Service
 *
 * Generates creative requirements from selected inventory, grouping
 * same-spec items into a single requirement.
 */

import type { CreativeRequirement, CreativeRequirementStatus } from '@/types/trading-models';

// Map screen types to canonical format + label
// Mirrors FORMAT_SPECS in src/utils/creativeRequirements.ts
const SCREEN_TYPE_FORMAT_MAP: Record<string, { canonicalFormat: string; label: string }> = {
  Billboard: { canonicalFormat: 'landscape_16_9', label: '橫式 16:9' },
  Transit: { canonicalFormat: 'landscape_16_9', label: '橫式 16:9' },
  'Mega Screen': { canonicalFormat: 'landscape_16_9', label: '橫式 16:9' },
  Kiosk: { canonicalFormat: 'portrait_9_16', label: '直式 9:16' },
  Indoor: { canonicalFormat: 'portrait_9_16', label: '直式 9:16' },
  'Street Furniture': { canonicalFormat: 'square_1_1', label: '方形 1:1' },
};

export interface InventoryRequirementInput {
  inventoryId: string;
  screenType: string;
  requestedByCampaignId: string;
}

/**
 * Generate creative requirements from selected inventory items.
 * Same canonical-format items are grouped into a single requirement with
 * aggregated venue count.
 */
export function generateCreativeRequirementsFromInventory(
  inventoryItems: InventoryRequirementInput[],
): CreativeRequirement[] {
  const groups = new Map<
    string,
    {
      canonicalFormat: string;
      venueCount: number;
      inventoryIds: string[];
      requestedByCampaignId: string;
    }
  >();

  for (const item of inventoryItems) {
    const mapping = SCREEN_TYPE_FORMAT_MAP[item.screenType];
    // Fall back to landscape_16_9 for unknown screen types
    const canonicalFormat = mapping?.canonicalFormat ?? 'landscape_16_9';

    const existing = groups.get(canonicalFormat);
    if (existing) {
      existing.venueCount++;
      existing.inventoryIds.push(item.inventoryId);
    } else {
      groups.set(canonicalFormat, {
        canonicalFormat,
        venueCount: 1,
        inventoryIds: [item.inventoryId],
        requestedByCampaignId: item.requestedByCampaignId,
      });
    }
  }

  const requirements: CreativeRequirement[] = [];
  let index = 0;

  for (const [, group] of groups) {
    index++;
    requirements.push({
      id: `req-gen-${index}`,
      campaignId: group.requestedByCampaignId,
      proposalId: null,
      canonicalFormat: group.canonicalFormat,
      status: 'missing' as CreativeRequirementStatus,
      venueCount: group.venueCount,
      requestedByCampaignId: group.requestedByCampaignId,
    });
  }

  return requirements;
}

/**
 * Group a list of requirements by canonical format, merging venue counts.
 */
export function groupSameSpecsIntoSingleRequirement(
  requirements: CreativeRequirement[],
): CreativeRequirement[] {
  const groups = new Map<string, CreativeRequirement>();

  for (const req of requirements) {
    const key = req.canonicalFormat;
    const existing = groups.get(key);
    if (existing) {
      existing.venueCount += req.venueCount;
    } else {
      groups.set(key, { ...req });
    }
  }

  return Array.from(groups.values());
}

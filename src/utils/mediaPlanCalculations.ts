import { InventoryLocation, MediaPlanItem, CampaignEstimate } from '../types/inventory';

/**
 * Add an item to the media plan. 
 * Prevents duplicate inventory additions.
 */
export function addToMediaPlan(
  selectedItems: MediaPlanItem[], 
  inventoryLocation: InventoryLocation, 
  days: number = 7
): MediaPlanItem[] {
  const isDuplicate = selectedItems.some(item => item.inventoryId === inventoryLocation.id);
  
  if (isDuplicate) {
    return selectedItems; // Return unchanged array if it already exists
  }
  
  return [...selectedItems, { inventoryId: inventoryLocation.id, days }];
}

/**
 * Remove an item from the media plan by ID.
 */
export function removeFromMediaPlan(
  selectedItems: MediaPlanItem[], 
  inventoryLocationId: string
): MediaPlanItem[] {
  return selectedItems.filter(item => item.inventoryId !== inventoryLocationId);
}

/**
 * Check if a specific inventory location is already in the media plan.
 */
export function isInMediaPlan(
  selectedItems: MediaPlanItem[], 
  inventoryLocationId: string
): boolean {
  return selectedItems.some(item => item.inventoryId === inventoryLocationId);
}

/**
 * Calculate the estimated metrics for the campaign.
 * Assumes the provided selectedItems correspond to the full inventory list.
 */
export function calculateCampaignEstimate(
  selectedItems: MediaPlanItem[], 
  allInventory: InventoryLocation[],
  campaignDays: number
): CampaignEstimate {
  // If no items, return zeros
  if (selectedItems.length === 0) {
    return {
      selectedLocationCount: 0,
      totalDailyImpressions: 0,
      estimatedCampaignImpressions: 0,
      totalCampaignBudget: 0,
      averageCpm: 0
    };
  }

  // Ensure campaignDays is at least 1
  const validCampaignDays = Math.max(1, isNaN(campaignDays) ? 1 : campaignDays);

  let totalDailyImpressions = 0;
  let totalDailyBudget = 0;

  // Calculate daily totals by mapping selected items to the inventory database
  selectedItems.forEach(item => {
    const inventory = allInventory.find(inv => inv.id === item.inventoryId);
    if (inventory) {
      totalDailyImpressions += inventory.dailyImpressions;
      totalDailyBudget += inventory.pricePerDay;
    }
  });

  // Calculate campaign totals
  const estimatedCampaignImpressions = totalDailyImpressions * validCampaignDays;
  const estimatedCampaignBudget = totalDailyBudget * validCampaignDays;

  // Calculate average CPM
  // CPM formula: (Total Cost / Total Impressions) * 1000
  const averageCpm = estimatedCampaignImpressions > 0 
    ? (estimatedCampaignBudget / estimatedCampaignImpressions) * 1000 
    : 0;

  return {
    selectedLocationCount: selectedItems.length,
    totalDailyImpressions,
    estimatedCampaignImpressions,
    totalCampaignBudget: estimatedCampaignBudget,
    averageCpm
  };
}

import { supabase } from '@/lib/supabase';
import { MediaPlanItem, InventoryLocation } from '@/types/inventory';

// Hardcoded default advertiser/user until auth is implemented
const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

interface SubmitCampaignInput {
  selectedItems: MediaPlanItem[];
  allInventory: InventoryLocation[];
  campaignDays: number;
  totalBudget: number;
  estimatedImpressions: number;
}

export async function createAndSubmitCampaign({
  selectedItems,
  allInventory,
  campaignDays,
  totalBudget,
  estimatedImpressions,
}: SubmitCampaignInput): Promise<string> {
  const campaignName = `Campaign ${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}`;

  // Step 1: Create the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      advertiser_id: DEFAULT_ADVERTISER_ID,
      created_by_user_id: DEFAULT_USER_ID,
      name: campaignName,
      objective: 'awareness',
      status: 'pending_review',
      buying_type: 'direct',
      campaign_days: campaignDays,
      total_budget: totalBudget,
      estimated_impressions: estimatedImpressions,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? 'Failed to create campaign');
  }

  const campaignId = campaign.id as string;

  // Step 2: Insert inventory items
  const inventoryRows = selectedItems.map((item) => {
    const inv = allInventory.find(i => i.id === item.inventoryId);
    if (!inv) throw new Error(`Inventory not found: ${item.inventoryId}`);
    return {
      campaign_id: campaignId,
      inventory_location_id: item.inventoryId,
      days: item.days,
      price_per_day: inv.pricePerDay,
      daily_impressions: inv.dailyImpressions,
    };
  });

  const { error: itemsError } = await supabase
    .from('campaign_inventory_items')
    .insert(inventoryRows);

  if (itemsError) throw new Error(itemsError.message);

  return campaignId;
}

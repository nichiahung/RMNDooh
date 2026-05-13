import { supabase } from '@/lib/supabase';
import { Campaign, CreativeAsset, InventoryLocation, Screen } from '@/types/inventory';

// ── Campaigns ────────────────────────────────────────────────────

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      objective,
      status,
      buying_type,
      start_date,
      end_date,
      campaign_days,
      total_budget,
      estimated_impressions,
      submitted_at,
      approval_notes,
      advertiser_id,
      advertisers ( name ),
      campaign_inventory_items (
        inventory_location_id,
        days,
        price_per_day,
        daily_impressions
      ),
      creative_assets (
        id,
        name,
        approval_status,
        created_at,
        media_assets (
          public_url,
          mime_type,
          file_size_bytes,
          duration_seconds
        )
      )
    `)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch campaigns:', error.message);
    return [];
  }

  return (data ?? []).map(mapCampaignRow);
}

export async function updateCampaignStatus(
  id: string,
  status: Campaign['status'],
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({
      status,
      approval_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateCreativeApprovalStatus(
  creativeAssetId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('creative_assets')
    .update({ approval_status: status, reviewed_at: new Date().toISOString() })
    .eq('id', creativeAssetId);

  if (error) throw new Error(error.message);
}

// ── Screens ──────────────────────────────────────────────────────

export async function fetchAllScreens(): Promise<Screen[]> {
  const { data, error } = await supabase
    .from('screens')
    .select(`
      id,
      screen_code,
      screen_name,
      status,
      orientation,
      resolution,
      last_heartbeat_at,
      current_campaign_id,
      inventory_location_id,
      inventory_locations ( name, district )
    `)
    .eq('is_active', true)
    .order('screen_code');

  if (error) {
    console.error('Failed to fetch screens:', error.message);
    return [];
  }

  return (data ?? []).map(mapScreenRow);
}

// ── Mappers ──────────────────────────────────────────────────────

function mapCampaignRow(row: Record<string, unknown>): Campaign {
  const advertiserInfo = row.advertisers as { name: string } | null;
  const items = (row.campaign_inventory_items as Record<string, unknown>[] | null) ?? [];
  const creativeRows = (row.creative_assets as Record<string, unknown>[] | null) ?? [];

  const creatives: CreativeAsset[] = creativeRows.map((cr) => {
    const media = cr.media_assets as Record<string, unknown> | null;
    return {
      id: cr.id as string,
      name: cr.name as string,
      type: (media?.mime_type ?? 'image/jpeg') as CreativeAsset['type'],
      fileSize: Number(media?.file_size_bytes ?? 0),
      durationSeconds: media?.duration_seconds ? Number(media.duration_seconds) : undefined,
      previewUrl: (media?.public_url as string) ?? '',
      status: (cr.approval_status as CreativeAsset['status']) ?? 'pending_review',
      uploadedAt: (cr.created_at as string) ?? new Date().toISOString(),
    };
  });

  return {
    id: row.id as string,
    name: row.name as string,
    advertiserName: advertiserInfo?.name ?? '',
    objective: row.objective as string,
    status: row.status as Campaign['status'],
    startDate: (row.start_date as string) ?? '',
    endDate: (row.end_date as string) ?? '',
    submittedAt: (row.submitted_at as string) ?? new Date().toISOString(),
    approvalNotes: (row.approval_notes as string) ?? '',
    estimatedBudget: Number(row.total_budget ?? 0),
    estimatedImpressions: Number(row.estimated_impressions ?? 0),
    selectedItems: items.map((item) => ({
      inventoryId: item.inventory_location_id as string,
      days: Number(item.days),
    })),
    creatives,
  };
}

function mapScreenRow(row: Record<string, unknown>): Screen {
  return {
    screenId: row.screen_code as string,
    screenName: row.screen_name as string,
    inventoryLocationId: row.inventory_location_id as string,
    status: row.status as Screen['status'],
    orientation: row.orientation as Screen['orientation'],
    resolution: row.resolution as string,
    lastHeartbeatAt: (row.last_heartbeat_at as string) ?? new Date().toISOString(),
    currentCampaignId: (row.current_campaign_id as string) ?? undefined,
  };
}

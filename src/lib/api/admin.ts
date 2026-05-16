import { supabase } from '@/lib/supabase';
import { Campaign, CreativeAsset, Screen } from '@/types/inventory';
import {
  deriveCampaignCreativeStatus,
  deriveLaunchReadinessStatus,
} from '@/utils/adminCampaignStatus';

// ── Campaigns ────────────────────────────────────────────────────

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, objective, status,
      booking_status, creative_status, launch_readiness,
      start_date, end_date, campaign_days,
      total_budget, estimated_impressions,
      submitted_at, approval_notes, advertiser_id,
      advertisers ( name ),
      campaign_inventory_items (
        inventory_location_id, days, price_per_day, daily_impressions
      ),
      creative_assets (
        id, name, approval_status, created_at,
        media_assets ( public_url, mime_type, file_size_bytes, duration_seconds )
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

export async function confirmBooking(campaignId: string, notes?: string): Promise<void> {
  const { data: items, error: itemsError } = await supabase
    .from('campaign_inventory_items')
    .select('days, price_per_day')
    .eq('campaign_id', campaignId);

  if (itemsError) throw new Error(itemsError.message);

  const totalAmount = (items ?? []).reduce(
    (sum, item) => sum + Number(item.price_per_day ?? 0) * Number(item.days ?? 0),
    0,
  );

  const { data: existingBooking, error: existingError } = await supabase
    .from('campaign_bookings')
    .select('id')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const now = new Date().toISOString();
  const creativeStatus = await getDerivedCreativeStatus(campaignId);
  const bookingPayload = {
    total_amount: totalAmount,
    booking_status: 'confirmed',
    confirmed_at: now,
    updated_at: now,
  };

  if (existingBooking?.id) {
    const { error: bookingError } = await supabase
      .from('campaign_bookings')
      .update(bookingPayload)
      .eq('id', existingBooking.id as string);

    if (bookingError) throw new Error(bookingError.message);
  } else {
    const { error: bookingError } = await supabase
      .from('campaign_bookings')
      .insert({
        campaign_id: campaignId,
        ...bookingPayload,
      });

    if (bookingError) throw new Error(bookingError.message);
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      booking_status: 'confirmed',
      status: 'approved',
      creative_status: creativeStatus,
      launch_readiness: deriveLaunchReadinessStatus('confirmed', creativeStatus, 'not_ready'),
      approval_notes: notes ?? null,
      booking_confirmed_at: now,
      reviewed_at: now,
    })
    .eq('id', campaignId);

  if (error) throw new Error(error.message);
}

export async function updateBookingStatus(
  campaignId: string,
  bookingStatus: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({
      booking_status: bookingStatus,
      launch_blocked_reason: notes ?? null,
    })
    .eq('id', campaignId);

  if (error) throw new Error(error.message);
}

export async function updateCreativeApprovalStatus(
  creativeAssetId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error: assetError } = await supabase
    .from('creative_assets')
    .update({ approval_status: status, reviewed_at: new Date().toISOString() })
    .eq('id', creativeAssetId);

  if (assetError) throw new Error(assetError.message);

  // Recompute creative_status on the parent campaign
  const { data: asset } = await supabase
    .from('creative_assets')
    .select('campaign_id, media_asset_id')
    .eq('id', creativeAssetId)
    .single();

  if (asset?.campaign_id) {
    if (asset.media_asset_id) {
      await supabase
        .from('campaign_creative_requirements')
        .update({ status, media_asset_id: asset.media_asset_id, reviewed_at: new Date().toISOString() })
        .eq('campaign_id', asset.campaign_id as string)
        .eq('media_asset_id', asset.media_asset_id as string);
    }

    await recomputeCampaignStatuses(asset.campaign_id as string);
  }
}

async function getDerivedCreativeStatus(campaignId: string): Promise<string> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('creative_status')
    .eq('id', campaignId)
    .single();

  const { data: assets } = await supabase
    .from('creative_assets')
    .select('approval_status')
    .eq('campaign_id', campaignId);

  return deriveCampaignCreativeStatus(
    (assets ?? []).map(asset => asset.approval_status as string),
    campaign?.creative_status as string | null,
  );
}

async function recomputeCampaignStatuses(campaignId: string): Promise<void> {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('booking_status, creative_status, launch_readiness')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) throw new Error(error?.message ?? 'Campaign not found');

  const creativeStatus = await getDerivedCreativeStatus(campaignId);
  const launchReadiness = deriveLaunchReadinessStatus(
    campaign.booking_status as string,
    creativeStatus,
    campaign.launch_readiness as string,
  );

  await supabase
    .from('campaigns')
    .update({ creative_status: creativeStatus, launch_readiness: launchReadiness })
    .eq('id', campaignId);
}

// ── Screens ──────────────────────────────────────────────────────

export async function fetchAllScreens(): Promise<Screen[]> {
  const { data, error } = await supabase
    .from('screens')
    .select(`
      id, screen_code, screen_name, status, orientation,
      resolution, last_heartbeat_at, current_campaign_id,
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
  const bookingStatus = (row.booking_status as string) ?? 'draft';
  const creativeStatus = deriveCampaignCreativeStatus(
    creativeRows.map(creative => creative.approval_status as string),
    row.creative_status as string | null,
  );
  const launchReadiness = deriveLaunchReadinessStatus(
    bookingStatus,
    creativeStatus,
    row.launch_readiness as string | null,
  );

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
    bookingStatus,
    creativeStatus,
    launchReadiness,
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

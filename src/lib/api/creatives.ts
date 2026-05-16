import { supabase } from '@/lib/supabase';
import { CreativeAsset } from '@/types/inventory';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';
const BUCKET = 'creative-assets';

export async function uploadCreativeAsset(file: File): Promise<CreativeAsset> {
  // Use local objectURL for immediate preview — no dependency on Storage URL loading
  const localPreviewUrl = URL.createObjectURL(file);

  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `advertisers/${DEFAULT_ADVERTISER_ID}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Create media_asset record in DB
  const { data: asset, error: dbError } = await supabase
    .from('media_assets')
    .insert({
      advertiser_id: DEFAULT_ADVERTISER_ID,
      uploaded_by_user_id: DEFAULT_USER_ID,
      original_filename: file.name,
      storage_path: storagePath,
      public_url: publicUrl,
      file_type: file.type.startsWith('video') ? 'video' : 'image',
      mime_type: file.type,
      file_size_bytes: file.size,
      status: 'ready',
    })
    .select('id')
    .single();

  if (dbError || !asset) throw new Error(dbError?.message ?? 'Failed to save asset');

  return {
    id: asset.id as string,
    name: file.name,
    type: file.type as CreativeAsset['type'],
    fileSize: file.size,
    durationSeconds: undefined,
    previewUrl: localPreviewUrl, // local blob URL for instant preview
    status: 'pending_review',
    uploadedAt: new Date().toISOString(),
  };
}

export async function listMediaAssets(): Promise<Array<{
  id: string;
  originalFilename: string;
  publicUrl: string;
  fileType: 'image' | 'video';
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  createdAt: string;
}>> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('uploaded_by_user_id', DEFAULT_USER_ID)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id as string,
    originalFilename: row.original_filename as string,
    publicUrl: row.public_url as string,
    fileType: row.file_type as 'image' | 'video',
    mimeType: row.mime_type as string,
    fileSizeBytes: row.file_size_bytes as number,
    status: row.status as string,
    createdAt: row.created_at as string,
  }));
}

// Links uploaded media_assets to a campaign as creative_assets
export async function linkCreativesToCampaign(
  campaignId: string,
  creatives: CreativeAsset[]
): Promise<void> {
  if (creatives.length === 0) return;

  const rows = creatives.map(c => ({
    campaign_id: campaignId,
    media_asset_id: c.id,           // id == media_asset.id from uploadCreativeAsset
    name: c.name,
    source: 'platform',
    approval_status: 'pending_review',
  }));

  const { error } = await supabase.from('creative_assets').insert(rows);
  if (error) throw new Error(error.message);
}

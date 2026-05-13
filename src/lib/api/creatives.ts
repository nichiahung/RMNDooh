import { supabase } from '@/lib/supabase';
import { CreativeAsset } from '@/types/inventory';

const DEFAULT_ADVERTISER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';
const BUCKET = 'creative-assets';

export async function uploadCreativeAsset(file: File): Promise<CreativeAsset> {
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

  // Return CreativeAsset shape for frontend state
  return {
    id: asset.id as string,
    name: file.name,
    type: file.type as CreativeAsset['type'],
    fileSize: file.size,
    durationSeconds: undefined,
    previewUrl: publicUrl,
    status: 'pending_review',
    uploadedAt: new Date().toISOString(),
  };
}

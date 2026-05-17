'use client';

import { useEffect, useRef, useState } from 'react';
import { listMediaAssets, uploadCreativeAsset } from '@/lib/api/creatives';
import { ImageIcon, Loader2, AlertCircle, Plus } from 'lucide-react';
import { AssetLibraryGrid } from '@/components/assets/AssetLibraryGrid';

type MediaAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];

export function AssetsPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMediaAssets()
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploading(true);
    setError(null);

    try {
      const asset = await uploadCreativeAsset(file);
      const newAsset: MediaAsset = {
        id: asset.id,
        originalFilename: asset.name,
        publicUrl: asset.previewUrl ?? '',
        fileType: asset.type.startsWith('video') ? 'video' : 'image',
        mimeType: asset.type,
        fileSizeBytes: asset.fileSize,
        status: 'ready',
        approvalStatus: 'pending_review',
        createdAt: asset.uploadedAt,
        isApproved: false,
      };
      setAssets(prev => [newAsset, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">素材庫</h1>
            <p className="text-sm text-slate-500 mt-0.5">所有上傳過的廣告素材</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{assets.length} 個素材</span>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? '上傳中…' : '新增素材'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-16 text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-1">素材庫是空的</p>
            <p className="text-xs text-slate-400 mb-4">在活動規劃中上傳素材後，會自動收錄在這裡。</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? '上傳中…' : '新增素材'}
            </button>
          </div>
        )}

        {!loading && !error && assets.length > 0 && <AssetLibraryGrid assets={assets} />}
    </div>
  );
}

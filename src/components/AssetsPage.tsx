'use client';

import { useEffect, useState } from 'react';
import { AppNav } from './AppNav';
import { listMediaAssets } from '@/lib/api/creatives';
import { ImageIcon, Loader2, AlertCircle, Film, CheckCircle2 } from 'lucide-react';

type MediaAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];

export function AssetsPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMediaAssets()
      .then(setAssets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const images = assets.filter(a => a.fileType === 'image');
  const videos = assets.filter(a => a.fileType === 'video');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">素材庫</h1>
            <p className="text-sm text-slate-500 mt-0.5">所有上傳過的廣告素材</p>
          </div>
          <span className="text-sm text-slate-400">{assets.length} 個素材</span>
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
            <p className="text-xs text-slate-400">在活動規劃中上傳素材後，會自動收錄在這裡。</p>
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <div className="space-y-8">
            {images.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" /> 圖片（{images.length}）
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map(asset => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              </section>
            )}
            {videos.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Film className="w-4 h-4" /> 影片（{videos.length}）
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {videos.map(asset => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function AssetCard({ asset }: { asset: Awaited<ReturnType<typeof listMediaAssets>>[number] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="h-32 bg-slate-100 relative">
        {asset.fileType === 'image' ? (
          <img src={asset.publicUrl} alt={asset.originalFilename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {asset.status === 'ready' && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 bg-white rounded-full" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-slate-800 truncate mb-1">{asset.originalFilename}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{(asset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
          <span className="text-[10px] text-slate-400">{new Date(asset.createdAt).toLocaleDateString('zh-TW')}</span>
        </div>
      </div>
    </div>
  );
}

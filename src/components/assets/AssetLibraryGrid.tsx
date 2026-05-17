'use client';

import { useMemo, useState } from 'react';
import { Film, ImageIcon } from 'lucide-react';
import type { MediaAssetSummary } from '@/lib/api/creatives';
import { AssetLibraryCard } from './AssetLibraryCard';

type AssetLibraryFilter = 'all' | 'pending_review' | 'approved' | 'rejected';

interface AssetLibraryGridProps {
  assets: MediaAssetSummary[];
  onDelete?: (id: string) => Promise<void> | void;
  onRename?: (id: string, newName: string) => Promise<void> | void;
}

const FILTERS: Array<{ id: AssetLibraryFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'pending_review', label: '待審核' },
  { id: 'approved', label: '已審核' },
  { id: 'rejected', label: '已退回' },
];

export function AssetLibraryGrid({ assets, onDelete, onRename }: AssetLibraryGridProps) {
  const [filter, setFilter] = useState<AssetLibraryFilter>('all');
  const counts = useMemo(() => getCounts(assets), [assets]);
  const filteredAssets = useMemo(() => {
    if (filter === 'all') return assets;
    if (filter === 'approved') return assets.filter(asset => asset.isApproved);
    return assets.filter(asset => asset.approvalStatus === filter);
  }, [assets, filter]);

  const images = filteredAssets.filter(asset => asset.fileType === 'image');
  const videos = filteredAssets.filter(asset => asset.fileType === 'video');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(item => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === item.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      {filteredAssets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-700">沒有符合條件的素材</p>
          <p className="mt-1 text-xs text-slate-400">切換上方分類查看其他審核狀態。</p>
        </div>
      ) : (
        <div className="space-y-8">
          {images.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-slate-500">
                <ImageIcon className="h-4 w-4" /> 圖片（{images.length}）
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {images.map(asset => (
                  <AssetLibraryCard key={asset.id} asset={asset} onDelete={onDelete} onRename={onRename} />
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-slate-500">
                <Film className="h-4 w-4" /> 影片（{videos.length}）
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {videos.map(asset => (
                  <AssetLibraryCard key={asset.id} asset={asset} onDelete={onDelete} onRename={onRename} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function getCounts(assets: MediaAssetSummary[]): Record<AssetLibraryFilter, number> {
  return {
    all: assets.length,
    pending_review: assets.filter(asset => asset.approvalStatus === 'pending_review').length,
    approved: assets.filter(asset => asset.isApproved).length,
    rejected: assets.filter(asset => asset.approvalStatus === 'rejected').length,
  };
}

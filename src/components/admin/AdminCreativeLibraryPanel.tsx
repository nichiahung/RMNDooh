'use client';

import { useEffect, useState } from 'react';
import { listAdminCreativeLibraryApi } from '@/lib/api/tradingIterationApi';
import type { CreativeAsset, CreativeAssetStatus } from '@/types/trading-models';

const STATUS_BADGE: Record<CreativeAssetStatus, { label: string; cls: string }> = {
  uploaded: { label: 'Uploaded', cls: 'bg-slate-100 text-slate-600' },
  validating: { label: 'Validating', cls: 'bg-blue-100 text-blue-700' },
  valid: { label: 'Valid', cls: 'bg-sky-100 text-sky-700' },
  invalid: { label: 'Invalid', cls: 'bg-red-100 text-red-700' },
  pending_review: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  approved_with_restrictions: { label: 'Approved (Restricted)', cls: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  revoked: { label: 'Revoked', cls: 'bg-slate-200 text-slate-500' },
};

export function AdminCreativeLibraryPanel() {
  const [assets, setAssets] = useState<CreativeAsset[] | null>(null);
  const [filter, setFilter] = useState<CreativeAssetStatus | 'all'>('all');

  useEffect(() => { listAdminCreativeLibraryApi().then(setAssets as (a: unknown) => void); }, []);

  if (!assets) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading creative library...</div>;

  const filtered = filter === 'all' ? assets : assets.filter(a => a.approvalStatus === filter);
  const statuses: Array<CreativeAssetStatus | 'all'> = ['all', 'uploaded', 'pending_review', 'approved', 'rejected'];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? `All (${assets.length})` : `${STATUS_BADGE[s].label} (${assets.filter(a => a.approvalStatus === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No assets matching this filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((asset) => {
            const badge = STATUS_BADGE[asset.approvalStatus] ?? { label: asset.approvalStatus, cls: 'bg-slate-100 text-slate-600' };
            return (
              <div key={asset.id} className="border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Preview area */}
                <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">{asset.fileType}</div>
                    {asset.width && asset.height && (
                      <div className="text-xs text-slate-500 mt-1">{asset.width} × {asset.height}</div>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-sm text-slate-800 truncate max-w-[180px]" title={asset.fileName}>
                      {asset.fileName}
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>v{asset.versionNumber}</span>
                    <span>{asset.fileSizeMb.toFixed(1)} MB</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {asset.durationSeconds != null && <span>{asset.durationSeconds}s • </span>}
                    <span>{asset.aspectRatio ?? '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

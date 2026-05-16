'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNav } from './AppNav';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listMediaAssets } from '@/lib/api/creatives';
import { Plus, FileText, ImageIcon, ChevronRight, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];
type MediaAsset = Awaited<ReturnType<typeof listMediaAssets>>[number];

function statusBadge(status: string, uploadedCount: number, totalCount: number) {
  if (status === 'draft' && totalCount === 0) return { label: '草稿', color: 'bg-slate-100 text-slate-600' };
  if (uploadedCount < totalCount) return { label: '素材未完整', color: 'bg-amber-100 text-amber-700' };
  if (status === 'pending_creative_review' || status === 'pending_review') return { label: '審核中', color: 'bg-blue-100 text-blue-700' };
  if (status === 'ready_to_book') return { label: '可下單', color: 'bg-emerald-100 text-emerald-700' };
  return { label: status, color: 'bg-slate-100 text-slate-600' };
}

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCampaignSummaries(), listMediaAssets()])
      .then(([c, a]) => { setCampaigns(c); setAssets(a); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">

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

        {!loading && !error && (
          <>
            {/* Campaigns section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">我的活動</h2>
                <Link href="/campaign-planner" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  <Plus className="w-4 h-4" /> 新增活動
                </Link>
              </div>

              {campaigns.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">還沒有活動</p>
                  <p className="text-xs text-slate-400 mb-4">點擊新增活動開始規劃你的第一個 DOOH 廣告活動</p>
                  <Link href="/campaign-planner" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus className="w-4 h-4" /> 新增活動
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => {
                    const badge = statusBadge(c.status, c.uploadedCount, c.totalCount);
                    return (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900 truncate">{c.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>{badge.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{c.inventoryCount} 個版位</span>
                            {c.totalCount > 0 && (
                              <span className="flex items-center gap-1">
                                {c.uploadedCount === c.totalCount
                                  ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  : <Clock className="w-3 h-3 text-amber-500" />}
                                素材 {c.uploadedCount}/{c.totalCount}
                              </span>
                            )}
                            <span>{new Date(c.createdAt).toLocaleDateString('zh-TW')}</span>
                          </div>
                        </div>
                        <Link
                          href="/campaign-planner"
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                        >
                          繼續 <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Assets section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">素材庫</h2>
                <Link href="/assets" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  查看全部 <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {assets.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">尚無素材。在活動中上傳素材後會顯示在這裡。</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {assets.slice(0, 8).map(asset => (
                    <div key={asset.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="h-24 bg-slate-100 relative">
                        {asset.fileType === 'image' ? (
                          <img src={asset.publicUrl} alt={asset.originalFilename} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">MP4</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-slate-700 truncate">{asset.originalFilename}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{(asset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

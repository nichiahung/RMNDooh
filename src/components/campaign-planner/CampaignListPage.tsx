'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  Monitor,
  Plus,
} from 'lucide-react';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import type { CampaignDraftStatus } from '@/types/campaign-draft';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];
type CampaignSource = 'self_purchase' | 'sales_proposal';

const STATUS_META: Record<CampaignDraftStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: '進行中', className: 'bg-blue-50 text-blue-700' },
  submitted_for_review: { label: '待審核', className: 'bg-amber-50 text-amber-700' },
  pending_review: { label: '待審核', className: 'bg-amber-50 text-amber-700' },
  ready_to_confirm: { label: '待確認', className: 'bg-indigo-50 text-indigo-700' },
  confirmed: { label: '已確認', className: 'bg-emerald-50 text-emerald-700' },
  pending_creative_review: { label: '素材審核中', className: 'bg-amber-50 text-amber-700' },
  blocked_by_creative: { label: '素材待處理', className: 'bg-red-50 text-red-700' },
  ready_to_book: { label: '待訂位', className: 'bg-indigo-50 text-indigo-700' },
  cancelled: { label: '已取消', className: 'bg-slate-100 text-slate-500' },
};

const SOURCE_META: Record<CampaignSource, { label: string; className: string }> = {
  self_purchase: { label: '自助建立', className: 'bg-cyan-50 text-cyan-700' },
  sales_proposal: { label: '業務提案', className: 'bg-violet-50 text-violet-700' },
};

function getCampaignSource(campaign: CampaignSummary): CampaignSource {
  const source = (campaign as CampaignSummary & { source?: CampaignSource }).source;
  return source === 'sales_proposal' ? 'sales_proposal' : 'self_purchase';
}

function formatDate(date: string | null): string {
  if (!date) return '未設定';
  return new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
}

export function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCampaignSummaries()
      .then(setCampaigns)
      .catch(err => setError(err instanceof Error ? err.message : '活動清單載入失敗'))
      .finally(() => setIsLoading(false));
  }, []);

  const stats = useMemo(() => {
    const activeStatuses: CampaignDraftStatus[] = ['in_progress', 'confirmed', 'ready_to_book'];
    return {
      total: campaigns.length,
      drafts: campaigns.filter(c => c.status === 'draft').length,
      pending: campaigns.filter(c => c.status === 'submitted_for_review' || c.status === 'pending_review' || c.status === 'pending_creative_review').length,
      active: campaigns.filter(c => activeStatuses.includes(c.status)).length,
    };
  }, [campaigns]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">活動管理</h1>
            <p className="text-sm text-slate-500 mt-1">查看自助建立與提案確認後形成的 Campaign。</p>
          </div>
          <Link
            href="/campaign-planner/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增自助活動
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '全部活動', value: stats.total, icon: Megaphone },
            { label: '草稿', value: stats.drafts, icon: FileText },
            { label: '待處理', value: stats.pending, icon: Clock },
            { label: '進行中', value: stats.active, icon: Monitor },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <item.icon className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Campaign List</h2>
              <p className="text-xs text-slate-500 mt-0.5">正式活動與草稿都集中在這裡管理。</p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              載入活動中...
            </div>
          )}

          {!isLoading && error && (
            <div className="flex items-center gap-2 m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && !error && campaigns.length === 0 && (
            <div className="text-center py-20 px-6">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-4">
                <Megaphone className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">還沒有活動</h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">建立第一個自助活動，或等待業務提案確認後轉入活動管理。</p>
              <Link
                href="/campaign-planner/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增自助活動
              </Link>
            </div>
          )}

          {!isLoading && !error && campaigns.length > 0 && (
            <div className="divide-y divide-slate-100">
              {campaigns.map(campaign => {
                const status = STATUS_META[campaign.status] ?? STATUS_META.draft;
                const source = SOURCE_META[getCampaignSource(campaign)];
                const href = `/campaign-planner/new?id=${campaign.id}`;

                return (
                  <Link
                    key={campaign.id}
                    href={href}
                    className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{campaign.name}</h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${source.className}`}>{source.label}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </span>
                        <span>{campaign.inventoryCount} 個版位</span>
                        <span>素材 {campaign.uploadedCount}/{campaign.totalCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                      {campaign.status === 'draft' ? '繼續編輯' : '查看活動'}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

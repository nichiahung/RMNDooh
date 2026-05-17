// src/components/shell/HomeView.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Plus, Megaphone, Image as ImageIcon, BarChart2,
  Sparkles, ChevronRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { mockReportData } from '@/data/mockReportData';
import type { ProposalStatus } from '@/types/trading-models';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:                   { label: '草稿',       color: 'text-slate-500 bg-slate-100' },
  in_progress:             { label: '進行中',     color: 'text-blue-700 bg-blue-50' },
  submitted_for_review:    { label: '待審核',     color: 'text-amber-700 bg-amber-50' },
  pending_review:          { label: '審核中',     color: 'text-amber-700 bg-amber-50' },
  ready_to_confirm:        { label: '待確認',     color: 'text-indigo-700 bg-indigo-50' },
  confirmed:               { label: '已確認',     color: 'text-green-700 bg-green-50' },
  pending_creative_review: { label: '素材審核中', color: 'text-amber-700 bg-amber-50' },
  blocked_by_creative:     { label: '素材待上傳', color: 'text-red-700 bg-red-50' },
  ready_to_book:           { label: '待訂位',     color: 'text-indigo-700 bg-indigo-50' },
  cancelled:               { label: '已取消',     color: 'text-slate-400 bg-slate-100' },
};

function AdvertiserHome() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCampaignSummaries()
      .then(c => setCampaigns(c))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  const heroCampaign = campaigns[0] ?? null;
  const otherCampaigns = campaigns.slice(1);
  const CAMPAIGN_LIMIT = 4;
  const visibleCampaigns = showAllCampaigns ? otherCampaigns : otherCampaigns.slice(0, CAMPAIGN_LIMIT);
  const totalBudgetSpent = mockReportData.reduce((sum, report) => sum + report.budgetSpent, 0);
  const totalPlays = mockReportData.reduce((sum, report) => sum + report.totalPlays, 0);
  const totalCompletedPlays = mockReportData.reduce((sum, report) => sum + report.completedPlays, 0);
  const totalEstimatedImpressions = mockReportData.reduce((sum, report) => sum + report.estimatedImpressionsDelivered, 0);
  const averageCpm = totalEstimatedImpressions > 0
    ? Math.round((totalBudgetSpent / totalEstimatedImpressions) * 1000)
    : 0;
  const underDeliveryLocation = mockReportData
    .flatMap(report => report.locationDelivery)
    .find(location => location.status === 'under_delivering');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">你好 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Hero — last campaign or empty state */}
      {!loading && (
        heroCampaign ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">上次進行中的活動</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">#1</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {heroCampaign.name?.trim() || '未命名活動'}
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {STATUS_LABEL[heroCampaign.status] && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[heroCampaign.status].color}`}>
                    {STATUS_LABEL[heroCampaign.status].label}
                  </span>
                )}
                <span className="text-xs text-slate-400">{heroCampaign.inventoryCount} 個版位</span>
                <span className="text-xs text-slate-400">素材 {heroCampaign.uploadedCount}/{heroCampaign.totalCount}</span>
              </div>
            </div>
            <Link
              href={`/campaign-planner/new?id=${heroCampaign.id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              繼續編輯 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 p-6 text-center">
            <Megaphone className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">開始你的第一個廣告活動</h2>
            <p className="text-slate-500 text-sm mb-4">選擇版位、設定時段、上傳素材</p>
            <Link
              href="/campaign-planner/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新增活動
            </Link>
          </div>
        )
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">快速操作</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/campaign-planner', icon: Megaphone, label: '活動管理',   color: 'text-indigo-600 bg-indigo-50' },
            { href: '/assets',           icon: ImageIcon,  label: '上傳素材',   color: 'text-purple-600 bg-purple-50' },
            { href: '/reports',          icon: BarChart2,  label: '查看報告',   color: 'text-green-600 bg-green-50' },
            { href: '/campaign-planner/new?view=ai', icon: Sparkles, label: 'AI 規劃', color: 'text-amber-600 bg-amber-50' },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Performance summary (mocked) */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">目前成效（模擬數據）</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: '花費預算', value: `NT$${(totalBudgetSpent / 1000).toFixed(0)}K` },
            { label: '播放次數', value: totalPlays.toLocaleString() },
            { label: '完成播放', value: totalCompletedPlays.toLocaleString() },
            { label: '預計曝光', value: `${(totalEstimatedImpressions / 10000).toFixed(0)}萬` },
            { label: '平均 CPM', value: `NT$${averageCpm}` },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Other campaigns */}
      {!loading && otherCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-500">其他活動</h3>
            <span className="text-xs text-slate-400">{otherCampaigns.length} 個</span>
          </div>
          <div className="space-y-2">
            {visibleCampaigns.map((c, i) => {
              const s = STATUS_LABEL[c.status] ?? { label: c.status, color: 'text-slate-500 bg-slate-100' };
              const seq = i + 2; // hero is #1, others start at #2
              return (
                <Link
                  key={c.id}
                  href={`/campaign-planner?id=${c.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300 w-6 text-right flex-shrink-0">#{seq}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {c.name?.trim() || `未命名活動`}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
          {otherCampaigns.length > CAMPAIGN_LIMIT && (
            <button
              onClick={() => setShowAllCampaigns(prev => !prev)}
              className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors"
            >
              {showAllCampaigns ? '收合' : `查看全部 ${otherCampaigns.length} 個活動`}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">待處理事項</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600">素材待上傳：檢查進行中 Campaign 的 Creative Asset 狀態。</p>
            <p className="text-slate-600">Booking 待確認：確認 ready_to_confirm Campaign。</p>
            {underDeliveryLocation && (
              <p className="text-amber-700">投放風險：{underDeliveryLocation.locationName} under-delivering。</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI 成效建議</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>解釋低投放 InventoryLocation 的可能原因。</p>
            <p>根據已完成 Campaign 推薦可加碼的 InventoryLocations。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesHome() {
  const [countsByStatus, setCountsByStatus] = useState<Record<ProposalStatus, number> | null>(null);
  const [proposals, setProposals] = useState<Awaited<ReturnType<typeof listAdminProposalsApi>>['proposals']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminProposalsApi()
      .then(({ proposals: p, countsByStatus: c }) => {
        setProposals(p);
        setCountsByStatus(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const followUpQueue = proposals.filter(p =>
    p.status === 'sent_to_advertiser' ||
    p.status === 'viewed_by_advertiser' ||
    p.status === 'change_requested' ||
    p.status === 'revised',
  );

  const pipeline: Array<{ label: string; status: ProposalStatus; textColor: string; bgColor: string }> = [
    { label: '草稿',     status: 'draft',                  textColor: 'text-slate-600', bgColor: 'bg-slate-100' },
    { label: '已送出',   status: 'sent_to_advertiser',     textColor: 'text-blue-600',  bgColor: 'bg-blue-50' },
    { label: '已查看',   status: 'viewed_by_advertiser',   textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: '要求修改', status: 'change_requested',       textColor: 'text-red-600',   bgColor: 'bg-red-50' },
    { label: '已核准',   status: 'approved_by_advertiser', textColor: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">業務工作台</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Proposal pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">提案管線</h3>
        <div className="grid grid-cols-5 gap-2">
          {pipeline.map(p => (
            <div key={p.status} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={`text-2xl font-bold ${p.textColor}`}>
                {!loading && countsByStatus ? (countsByStatus[p.status] ?? 0) : '—'}
              </p>
              <p className={`text-xs font-semibold mt-1 px-1.5 py-0.5 rounded-full inline-block ${p.textColor} ${p.bgColor}`}>
                {p.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up queue */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3">需要跟進</h3>
        {loading ? (
          <p className="text-sm text-slate-400">載入中…</p>
        ) : followUpQueue.length === 0 ? (
          <div className="bg-green-50 rounded-xl border border-green-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-700 font-medium">目前沒有待跟進的提案</p>
          </div>
        ) : (
          <div className="space-y-2">
            {followUpQueue.map(p => (
              <Link
                key={p.id}
                href="/proposal-review"
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  {p.status === 'change_requested'
                    ? <AlertCircle className="w-4 h-4 text-red-500" />
                    : <Clock className="w-4 h-4 text-amber-500" />
                  }
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'change_requested' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {p.status === 'change_requested'
                      ? '要求修改'
                      : p.status === 'sent_to_advertiser'
                        ? '已送出待回覆'
                        : p.status === 'revised'
                          ? '新版待回覆'
                          : '已查看未回覆'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Client performance signals + AI actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">客戶成效訊號</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>Taipei Retail Launch 已交付 1.25M 預估曝光，可作為續約素材。</p>
            <p>Airport Traveler Promotion 有 failed plays，需主動準備說明。</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">AI 業務動作</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>產生 Proposal follow-up email。</p>
            <p>根據成效報告產生 renewal / upsell Proposal 建議。</p>
          </div>
        </div>
      </div>

      <Link
        href="/proposal-builder"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-4 h-4" /> 新增提案
      </Link>
    </div>
  );
}

export function HomeView() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  if (currentUser.role === 'admin') return null;
  if (currentUser.role === 'sales') return <SalesHome />;
  return <AdvertiserHome />;
}

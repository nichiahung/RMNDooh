// src/components/shell/HomeView.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  Layers,
  MapPinned,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { mockReportData } from '@/data/mockReportData';
import { imgSrc } from '@/utils/imgSrc';
import { buildCampaignPlannerExploreHref } from '@/utils/plannerRoutes';
import type { ProposalStatus } from '@/types/trading-models';
import type { AuthUser } from '@/utils/mockAuth';

type CampaignSummary = Awaited<ReturnType<typeof listCampaignSummaries>>[number];

const AI_RECOMMENDATION_SETS = [
  {
    confidence: '92%',
    summary: '根據你去年同期的零售檔期投放內容，推薦表現相近且轉換機會較高的商圈。',
    metrics: [
      { value: '+18%', label: 'Reach lift' },
      { value: '2.2M', label: '預估曝光' },
      { value: 'NT$184', label: '建議 CPM' },
    ],
    venues: [
      { src: '/images/tpe_101.png', name: 'Taipei 101', label: '高單價零售客群', score: '94' },
      { src: '/images/tpe_main_station.png', name: 'Main Station', label: '通勤與旅遊高峰', score: '91' },
      { src: '/images/tpe_sogo.png', name: 'SOGO', label: '週末購物轉換', score: '88' },
    ],
  },
  {
    confidence: '89%',
    summary: '根據近期素材與週末曝光表現，推薦適合新品聲量擴散的高人流地點。',
    metrics: [
      { value: '+22%', label: 'Frequency lift' },
      { value: '1.8M', label: '預估曝光' },
      { value: 'NT$156', label: '建議 CPM' },
    ],
    venues: [
      { src: '/images/tpe_ximen.png', name: 'Ximending', label: '年輕娛樂客群', score: '90' },
      { src: '/images/tpe_shilin.png', name: 'Shilin', label: '夜間人流高峰', score: '86' },
      { src: '/images/ntpc_banqiao.png', name: 'Banqiao', label: '家庭與通勤混合', score: '84' },
    ],
  },
  {
    confidence: '87%',
    summary: '根據你過往 B2B Campaign 的完播率，推薦平日白天效率較高的商務地點。',
    metrics: [
      { value: '+15%', label: 'B2B fit' },
      { value: '1.4M', label: '預估曝光' },
      { value: 'NT$172', label: '建議 CPM' },
    ],
    venues: [
      { src: '/images/tpe_nangang.png', name: 'Nangang', label: '商務與展會客群', score: '89' },
      { src: '/images/tpe_neihu.png', name: 'Neihu', label: '科技園區通勤', score: '85' },
      { src: '/images/tpe_songshan.png', name: 'Songshan', label: '旅運與商務交會', score: '83' },
    ],
  },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:                   { label: '草稿',       color: 'text-slate-600 bg-slate-100 border-slate-200' },
  in_progress:             { label: '進行中',     color: 'text-blue-700 bg-blue-50 border-blue-100' },
  submitted_for_review:    { label: '待審核',     color: 'text-amber-700 bg-amber-50 border-amber-100' },
  pending_review:          { label: '審核中',     color: 'text-amber-700 bg-amber-50 border-amber-100' },
  ready_to_confirm:        { label: '待確認',     color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  confirmed:               { label: '已確認',     color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  pending_creative_review: { label: '素材審核中', color: 'text-amber-700 bg-amber-50 border-amber-100' },
  blocked_by_creative:     { label: '素材待上傳', color: 'text-red-700 bg-red-50 border-red-100' },
  ready_to_book:           { label: '待訂位',     color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  approved:                { label: '已核准',     color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  live:                    { label: '投放中',     color: 'text-blue-700 bg-blue-50 border-blue-100' },
  completed:               { label: '已完成',     color: 'text-slate-700 bg-slate-100 border-slate-200' },
  cancelled:               { label: '已取消',     color: 'text-slate-400 bg-slate-100 border-slate-200' },
};

function formatCompact(value: number): string {
  return new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCurrencyCompact(value: number): string {
  return `NT$${formatCompact(value)}`;
}

function campaignDisplayName(campaign: CampaignSummary, seq: number): string {
  if (campaign.name?.trim()) return campaign.name.trim();
  const d = new Date(campaign.createdAt);
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `Campaign_${yyyymmdd}_${String(seq).padStart(3, '0')}`;
}

function userDisplayName(user: AuthUser): string {
  const name = user.email.split('@')[0] ?? 'Advertiser';
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Advertiser';
}

function greetingLabel(): string {
  const hour = new Date().getHours();
  if (hour < 11) return '早安';
  if (hour < 18) return '午安';
  return '晚安';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
}

function campaignNextAction(campaign: CampaignSummary | null): string {
  if (!campaign) return '建立第一個投放草稿';
  if (campaign.totalCount > 0 && campaign.uploadedCount < campaign.totalCount) return '補齊素材';
  if (campaign.status === 'ready_to_confirm') return '確認 booking';
  return '繼續規劃';
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="flex min-h-[86px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-950">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function MarketplacePreview() {
  const [setIndex, setSetIndex] = useState(0);
  const recommendation = AI_RECOMMENDATION_SETS[setIndex];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-white shadow-xl">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-200">AI 投放建議</p>
          <p className="text-sm font-bold">本次最適合的地點組合</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">信心 {recommendation.confidence}</Badge>
          <button
            type="button"
            onClick={() => setSetIndex(current => (current + 1) % AI_RECOMMENDATION_SETS.length)}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            aria-label="換一批 AI 推薦地點"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            換一批
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs font-semibold leading-5 text-slate-400">
        {recommendation.summary}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {recommendation.venues.map(venue => (
          <div key={venue.name} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
            <Image
              src={imgSrc(venue.src)}
              alt={`${venue.name} InventoryLocation preview`}
              width={180}
              height={96}
              className="h-24 w-full object-cover"
            />
            <div className="p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-white">{venue.name}</p>
                <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">{venue.score}</span>
              </div>
              <p className="truncate text-[11px] text-slate-400">{venue.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        {recommendation.metrics.map(metric => (
          <div key={metric.label} className="rounded-lg bg-white/10 p-2">
            <p className="font-bold text-white">{metric.value}</p>
            <p className="text-slate-400">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/campaign-planner/new?view=ai"
          className="inline-flex h-9 flex-1 items-center justify-center rounded bg-cyan-300 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        >
          套用推薦
        </Link>
        <Link
          href={buildCampaignPlannerExploreHref()}
          className="inline-flex h-9 flex-1 items-center justify-center rounded border border-white/15 bg-white/5 text-xs font-bold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        >
          查看地圖
        </Link>
      </div>
    </div>
  );
}

function NextBestActions({ campaign }: { campaign: CampaignSummary | null }) {
  const action = campaignNextAction(campaign);

  const actions = campaign
    ? [
        { label: action, helper: campaignDisplayName(campaign, 1), icon: Sparkles, href: `/campaign-planner/new?id=${campaign.id}` },
        { label: '查看地圖版位', helper: '用地圖檢查可投放 InventoryLocation', icon: MapPinned, href: buildCampaignPlannerExploreHref() },
        { label: '檢視成效報告', helper: 'POP、完播率與地點交付', icon: BarChart2, href: '/reports' },
      ]
    : [
        { label: '查看 AI 推薦', helper: '先用目標與預算產生組合', icon: Sparkles, href: '/campaign-planner/new?view=ai' },
        { label: '探索地圖版位', helper: '搜尋、比較並加入 Media Plan', icon: MapPinned, href: buildCampaignPlannerExploreHref() },
        { label: '建立 Campaign', helper: '從空白規劃開始', icon: Plus, href: '/campaign-planner/new' },
      ];

  return (
    <div className="order-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:order-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Next best actions</h2>
          <p className="text-xs text-slate-500">依目前 Campaign 狀態排序</p>
        </div>
        <Sparkles className="h-4 w-4 text-indigo-600" />
      </div>
      <div className="space-y-2">
        {actions.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 transition hover:border-indigo-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-800 shadow-sm">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-950">{item.label}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{item.helper}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AdvertiserHome({ currentUser }: { currentUser: AuthUser }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [timeContext, setTimeContext] = useState({ greeting: '你好', date: '今日' });

  useEffect(() => {
    listCampaignSummaries()
      .then(c => setCampaigns(c))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setTimeContext({ greeting: greetingLabel(), date: todayLabel() });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const metrics = useMemo(() => {
    const totalBudgetSpent = mockReportData.reduce((sum, report) => sum + report.budgetSpent, 0);
    const totalPlays = mockReportData.reduce((sum, report) => sum + report.totalPlays, 0);
    const totalCompletedPlays = mockReportData.reduce((sum, report) => sum + report.completedPlays, 0);
    const totalEstimatedImpressions = mockReportData.reduce((sum, report) => sum + report.estimatedImpressionsDelivered, 0);
    const averageCpm = totalEstimatedImpressions > 0
      ? Math.round((totalBudgetSpent / totalEstimatedImpressions) * 1000)
      : 0;
    const completionRate = totalPlays > 0 ? Math.round((totalCompletedPlays / totalPlays) * 100) : 0;

    return { totalBudgetSpent, totalPlays, totalEstimatedImpressions, averageCpm, completionRate };
  }, []);

  const heroCampaign = campaigns[0] ?? null;
  const otherCampaigns = campaigns.slice(1);
  const visibleCampaigns = showAllCampaigns ? otherCampaigns : otherCampaigns.slice(0, 4);
  const activeCampaignStatus = heroCampaign
    ? STATUS_LABEL[heroCampaign.status] ?? { label: heroCampaign.status, color: 'border-slate-200 bg-slate-100 text-slate-600' }
    : null;
  const primaryHref = heroCampaign ? `/campaign-planner/new?id=${heroCampaign.id}` : '/campaign-planner/new?view=ai';
  const displayName = userDisplayName(currentUser);
  const nextAction = campaignNextAction(heroCampaign);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">Self-service DOOH</Badge>
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">{timeContext.date}</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {timeContext.greeting}，{displayName}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {heroCampaign
                ? `你有 1 個未完成規劃，下一步是「${nextAction}」。AI 已根據去年同期與近期投放訊號產生建議地點組合。`
                : '從 AI 推薦或地圖探索開始，建立第一個 DOOH Media Plan。'}
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Link
              href={primaryHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              {heroCampaign ? '繼續規劃' : '查看 AI 推薦'}
            </Link>
            <Link
              href={buildCampaignPlannerExploreHref()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <MapPinned className="h-4 w-4" />
              探索地圖
            </Link>
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(300px,0.72fr)_minmax(520px,1fr)_minmax(260px,0.62fr)]">
        <div className="order-2 flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:order-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Resume planning</p>
              <h2 className="mt-1 text-base font-bold text-slate-950">上次未完成活動規劃</h2>
            </div>
            {activeCampaignStatus && (
              <Badge className={activeCampaignStatus.color}>{activeCampaignStatus.label}</Badge>
            )}
          </div>

          <div className="mt-4 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Campaign</p>
                <p className="mt-1 truncate text-base font-bold text-slate-950">
                  {heroCampaign ? campaignDisplayName(heroCampaign, 1) : '尚未建立 Campaign'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-white p-2">
                <p className="text-slate-500">版位</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{heroCampaign?.inventoryCount ?? 0}</p>
              </div>
              <div className="rounded-md bg-white p-2">
                <p className="text-slate-500">素材</p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {heroCampaign ? `${heroCampaign.uploadedCount}/${heroCampaign.totalCount}` : '0/0'}
                </p>
              </div>
              <div className="rounded-md bg-white p-2">
                <p className="text-slate-500">下一步</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{nextAction}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href={heroCampaign ? `/campaign-planner/new?id=${heroCampaign.id}` : '/campaign-planner/new?view=ai'}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              {heroCampaign ? '繼續編輯' : '查看 AI 推薦'}
            </Link>
            <Link
              href={buildCampaignPlannerExploreHref()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <MapPinned className="h-4 w-4" />
              探索版位
            </Link>
          </div>
        </div>

        <div className="order-1 xl:order-2">
          <MarketplacePreview />
        </div>
        <NextBestActions campaign={heroCampaign} />
      </section>

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
        {[
          { icon: Gauge, label: '預估曝光', value: formatCompact(metrics.totalEstimatedImpressions), helper: '報表模擬' },
          { icon: Radio, label: '播放次數', value: formatCompact(metrics.totalPlays), helper: `${metrics.completionRate}% 完播` },
          { icon: TrendingUp, label: '平均 CPM', value: `NT$${metrics.averageCpm}`, helper: 'Spend / impressions' },
          { icon: BarChart2, label: '已花費', value: formatCurrencyCompact(metrics.totalBudgetSpent), helper: 'Mock reports' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-slate-500">{item.label}</span>
              <span className="mt-0.5 block text-lg font-bold text-slate-950">{item.value}</span>
              <span className="block truncate text-xs text-slate-500">{item.helper}</span>
            </span>
          </div>
        ))}
      </section>

      <section>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Campaign pipeline</h2>
              <p className="text-xs text-slate-500">最近活動與素材準備狀態</p>
            </div>
            {!loading && <span className="text-xs font-semibold text-slate-500">{campaigns.length} campaigns</span>}
          </div>

          {!loading && heroCampaign ? (
            <div className="divide-y divide-slate-100">
              <Link
                href={`/campaign-planner/new?id=${heroCampaign.id}`}
                className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 md:grid-cols-[120px_minmax(0,1fr)_180px_120px] md:items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">#1</span>
                  <Badge className={STATUS_LABEL[heroCampaign.status]?.color ?? 'border-slate-200 bg-slate-100 text-slate-600'}>
                    {STATUS_LABEL[heroCampaign.status]?.label ?? heroCampaign.status}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-950">{campaignDisplayName(heroCampaign, 1)}</h3>
                  <p className="mt-1 text-xs text-slate-500">最近編輯的 Campaign</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span><span className="font-bold text-slate-800">{heroCampaign.inventoryCount}</span> locations</span>
                  <span><span className="font-bold text-slate-800">{heroCampaign.uploadedCount}/{heroCampaign.totalCount}</span> creatives</span>
                </div>
                <span className="inline-flex items-center justify-start gap-1 text-xs font-bold text-indigo-700 md:justify-end">
                  繼續編輯 <ChevronRight className="h-4 w-4" />
                </span>
              </Link>

              {visibleCampaigns.map((campaign, i) => {
                const seq = i + 2;
                const status = STATUS_LABEL[campaign.status] ?? { label: campaign.status, color: 'border-slate-200 bg-slate-100 text-slate-600' };
                return (
                  <Link
                    key={campaign.id}
                    href={`/campaign-planner/new?id=${campaign.id}`}
                    className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 md:grid-cols-[120px_minmax(0,1fr)_180px_24px] md:items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">#{seq}</span>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-800">{campaignDisplayName(campaign, seq)}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span><span className="font-bold text-slate-800">{campaign.inventoryCount}</span> locations</span>
                      <span><span className="font-bold text-slate-800">{campaign.uploadedCount}/{campaign.totalCount}</span> creatives</span>
                    </div>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 justify-self-end text-slate-400 md:block" />
                  </Link>
                );
              })}
            </div>
          ) : !loading ? (
            <div className="p-8 text-center">
              <MapPinned className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h3 className="text-base font-bold text-slate-900">尚未建立 Campaign</h3>
              <p className="mt-1 text-sm text-slate-500">先從版位探索開始，5 分鐘內建立第一個投放草稿。</p>
            </div>
          ) : (
            <div className="p-8 text-sm text-slate-400">載入 Campaign 中...</div>
          )}

          {otherCampaigns.length > 4 && (
            <button
              onClick={() => setShowAllCampaigns(prev => !prev)}
              className="w-full border-t border-slate-200 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              {showAllCampaigns ? '收合' : `查看全部 ${otherCampaigns.length} 個活動`}
            </button>
          )}
        </div>

      </section>
    </div>
  );
}

function SalesHome() {
  const [countsByStatus, setCountsByStatus] = useState<Record<ProposalStatus, number> | null>(null);
  const [proposals, setProposals] = useState<Awaited<ReturnType<typeof listAdminProposalsApi>>['proposals']>([]);
  const [loading, setLoading] = useState(true);
  const [dateLabel, setDateLabel] = useState('今日');

  useEffect(() => {
    listAdminProposalsApi()
      .then(({ proposals: p, countsByStatus: c }) => {
        setProposals(p);
        setCountsByStatus(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDateLabel(todayLabel());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const followUpQueue = proposals.filter(p =>
    p.status === 'sent_to_advertiser' ||
    p.status === 'viewed_by_advertiser' ||
    p.status === 'change_requested' ||
    p.status === 'revised',
  );
  const pipelineValue = proposals.reduce((sum, proposal) => sum + (proposal.finalQuote ?? 0), 0);

  const pipeline: Array<{ label: string; status: ProposalStatus; icon: LucideIcon; color: string }> = [
    { label: '草稿',     status: 'draft',                  icon: FileText,    color: 'text-slate-700 bg-slate-100 border-slate-200' },
    { label: '已送出',   status: 'sent_to_advertiser',     icon: Send,        color: 'text-blue-700 bg-blue-50 border-blue-100' },
    { label: '已查看',   status: 'viewed_by_advertiser',   icon: Users,       color: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: '要求修改', status: 'change_requested',       icon: AlertCircle, color: 'text-red-700 bg-red-50 border-red-100' },
    { label: '已核准',   status: 'approved_by_advertiser', icon: CheckCircle2,color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Sales-assisted DOOH</Badge>
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                {dateLabel}
              </Badge>
            </div>
            <h1 className="mt-6 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              把提案、價格、客戶確認放進同一個業務工作台
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              參考一線 OOH 平台的 pipeline-first 首頁，讓業務一進來就知道該跟誰、推哪個 proposal、哪個 Campaign 可以轉 booking。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/proposal-builder"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4" />
                新增提案
              </Link>
              <Link
                href="/proposal-review"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Layers className="h-4 w-4" />
                檢視提案管線
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard icon={FileText} label="提案數" value={loading ? '--' : String(proposals.length)} helper="目前 sales-assisted pipeline" />
            <MetricCard icon={CalendarDays} label="需跟進" value={loading ? '--' : String(followUpQueue.length)} helper="已送出、已查看、要求修改" />
            <MetricCard icon={TrendingUp} label="管線金額" value={formatCurrencyCompact(pipelineValue)} helper="Proposal final quote 合計" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {pipeline.map(item => (
          <div key={item.status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg border ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-slate-950">
              {!loading && countsByStatus ? (countsByStatus[item.status] ?? 0) : '--'}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-950">需要跟進</h2>
            <p className="text-xs text-slate-500">把客戶回覆與修正需求集中處理</p>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-400">載入中...</div>
          ) : followUpQueue.length === 0 ? (
            <div className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">目前沒有待跟進的提案</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {followUpQueue.map(proposal => (
                <Link
                  key={proposal.id}
                  href="/proposal-review"
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      {proposal.status === 'change_requested'
                        ? <AlertCircle className="h-4 w-4 text-red-500" />
                        : <Clock className="h-4 w-4 text-amber-500" />
                      }
                      <span className="truncate text-sm font-bold text-slate-900">{proposal.name}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {proposal.status === 'change_requested'
                        ? '客戶要求修改'
                        : proposal.status === 'sent_to_advertiser'
                          ? '已送出待回覆'
                          : proposal.status === 'revised'
                            ? '新版待回覆'
                            : '已查看未回覆'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-950">客戶成效訊號</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>Taipei Retail Launch 已交付 1.25M 預估曝光，可作為續約素材。</p>
              <p>Airport Traveler Promotion 有 failed plays，需主動準備說明。</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-950">AI 業務動作</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>產生 Proposal follow-up email。</p>
              <p>根據成效報告產生 renewal / upsell Proposal 建議。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HomeView() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  if (currentUser.role === 'admin') return null;
  if (currentUser.role === 'sales') return <SalesHome />;
  return <AdvertiserHome currentUser={currentUser} />;
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, MessageSquare, RotateCcw, Calendar, MapPin, DollarSign, Image as ImageIcon } from 'lucide-react';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import { approveProposalVersionApi } from '@/lib/api/tradingIterationApi';
import { useAuth } from '@/context/AuthContext';
import type { Proposal, ProposalStatus } from '@/types/trading-models';

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-slate-100 text-slate-600' },
  sent_to_advertiser: { label: '等待確認', cls: 'bg-blue-100 text-blue-700' },
  viewed_by_advertiser: { label: '已查看', cls: 'bg-sky-100 text-sky-700' },
  commented: { label: '已留言', cls: 'bg-amber-100 text-amber-700' },
  change_requested: { label: '已要求修改', cls: 'bg-orange-100 text-orange-700' },
  revised: { label: '新版待確認', cls: 'bg-indigo-100 text-indigo-700' },
  approved_by_advertiser: { label: '已確認，建立活動中', cls: 'bg-emerald-100 text-emerald-700' },
  expired: { label: '已過期', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: '已取消', cls: 'bg-slate-200 text-slate-500' },
};

export function ProposalReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>}>
      <ProposalReviewPageContent />
    </Suspense>
  );
}

function ProposalReviewPageContent() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const queryId = searchParams.get('proposalId');
  const isSales = currentUser?.role === 'sales';
  const canConfirmProposal = currentUser?.role === 'advertiser';
  const pageTitle = isSales ? '提案跟進' : '提案確認';
  const listTitle = isSales ? '需跟進提案' : '待確認提案';
  const emptyText = isSales ? '目前沒有需要跟進的提案。' : '目前沒有待確認提案。';

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    listAdminProposalsApi().then(data => {
      // Show only proposals that have been sent or further
      const reviewable = data.proposals.filter(p =>
        p.status !== 'draft' && p.status !== 'cancelled',
      );
      setProposals(reviewable);

      if (queryId) {
        const found = reviewable.find(p => p.id === queryId);
        if (found) setSelected(found);
      } else if (reviewable.length > 0) {
        setSelected(reviewable[0]);
      }
      setIsLoading(false);
    });
  }, [queryId]);

  const handleApprove = async () => {
    if (!selected) return;
    await approveProposalVersionApi(selected.id);
    setSelected({ ...selected, status: 'approved_by_advertiser' });
    setProposals(prev => prev.map(p => p.id === selected.id ? { ...p, status: 'approved_by_advertiser' } : p));
    setActionDone('approved');
  };

  const handleRequestChange = async () => {
    if (!selected) return;
    // In a real app this would call a specific API — for now just update status locally
    setSelected({ ...selected, status: 'change_requested' });
    setProposals(prev => prev.map(p => p.id === selected.id ? { ...p, status: 'change_requested' } : p));
    setActionDone('change_requested');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 animate-pulse">
        載入提案中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-slate-800">{pageTitle}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {proposals.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500">{emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Proposal list */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 px-1">{listTitle}</h2>
              {proposals.map((p) => {
                const badge = STATUS_BADGE[p.status];
                const isActive = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p); setActionDone(null); }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-800">{p.name}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                      {p.finalQuote != null && (
                        <span className="text-xs font-semibold text-indigo-600">NT${p.finalQuote.toLocaleString()}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Proposal detail */}
            {selected && (
              <div className="lg:col-span-2 space-y-6">
                {/* Action done banner */}
                {actionDone === 'approved' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    提案已確認。系統會將它轉入活動管理流程。
                  </div>
                )}
                {actionDone === 'change_requested' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                    <RotateCcw className="w-4 h-4" />
                    修改需求已送出。業務會依回饋調整提案。
                  </div>
                )}

                {/* Header card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selected.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">提案 ID：{selected.id}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status].cls}`}>
                      {STATUS_BADGE[selected.status].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">投放期間</div>
                        <div className="text-sm text-slate-700">{selected.requestedStartDate} → {selected.requestedEndDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">天數</div>
                        <div className="text-sm text-slate-700">{selected.requestedDays ?? '—'} 天</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">報價</div>
                        <div className="text-sm font-semibold text-indigo-700">
                          {selected.finalQuote != null ? `NT$${selected.finalQuote.toLocaleString()}` : '待確認'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">素材</div>
                        <div className="text-sm text-slate-700">確認後上傳</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing — advertiser-facing only (no internal pricing) */}
                {selected.finalQuote != null && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      報價摘要
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="text-xs text-indigo-500 uppercase tracking-wider font-medium">總報價</div>
                        <div className="text-2xl font-bold text-indigo-700 mt-1">NT${selected.finalQuote.toLocaleString()}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">付款條件</div>
                        <div className="text-sm text-slate-700 mt-1">訂位確認後 30 天付款</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      * 報價自提案日期起 14 天內有效，未稅。
                    </p>
                  </div>
                )}

                {/* Actions */}
                {canConfirmProposal && (selected.status === 'sent_to_advertiser' || selected.status === 'revised' || selected.status === 'viewed_by_advertiser') && !actionDone && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-800 mb-4">你的確認結果</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        確認提案
                      </button>
                      <button
                        onClick={handleRequestChange}
                        className="flex items-center gap-2 px-6 py-2.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        要求修改
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        補充留言
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

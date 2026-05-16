'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, ShoppingCart, Loader2, ChevronRight, CheckCircle2, Clock, LogOut, MapPin, Sparkles } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import type { Proposal } from '@/types/trading-models';

export function WorkspacePage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const role = currentUser?.role ?? 'advertiser';
  const [drafts, setDrafts] = useState<Awaited<ReturnType<typeof listCampaignSummaries>>>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listCampaignSummaries(),
      listAdminProposalsApi().then(res => res.proposals)
    ]).then(([d, p]) => {
      setDrafts(d);
      setProposals(p);
      setIsLoading(false);
    });
  }, []);

  const showSelfService = role === 'advertiser' || role === 'admin';
  const showProposals = role === 'sales' || role === 'admin';
  const showQuickStart = role === 'advertiser' || role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/drmn-logo.png" alt="DRMN" height={28} width={100} className="object-contain" />
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                進入管理後台
              </Link>
            )}
            <span className="text-sm text-slate-500">{currentUser?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 登出
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">

        {/* Quick-start cards — advertiser + admin */}
        {showQuickStart && (
          <section>
            <p className="text-sm text-slate-500 mb-4">從這裡開始</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Explore map */}
              <button
                onClick={() => router.push('/campaign-planner?view=map')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">探索版位</h3>
                <p className="text-xs text-slate-500 leading-relaxed">瀏覽台北・新北・桃園的廣告點位地圖</p>
                <p className="text-xs text-indigo-600 font-semibold mt-4">開啟地圖 →</p>
              </button>

              {/* AI suggestions */}
              <button
                onClick={() => router.push('/campaign-planner?view=ai')}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">AI 版位建議</h3>
                <p className="text-xs text-slate-500 leading-relaxed">描述目標，AI 幫你挑出最佳版位組合</p>
                <p className="text-xs text-indigo-600 font-semibold mt-4">問 AI →</p>
              </button>

              {/* New campaign */}
              <button
                onClick={() => router.push('/campaign-planner')}
                className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl p-6 text-left transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">新增活動</h3>
                <p className="text-xs text-indigo-200 leading-relaxed">選版位、上傳素材、直接送審下單</p>
                <p className="text-xs text-white font-semibold mt-4">開始規劃 →</p>
              </button>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {showSelfService && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-indigo-500" />
                      自助購買
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">你的活動草稿與送審紀錄</p>
                  </div>
                  <button
                    onClick={() => router.push('/campaign-planner')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 新增活動
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {drafts.length === 0 ? (
                    <div className="col-span-2 text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">目前沒有任何活動草稿</p>
                      <button
                        onClick={() => router.push('/campaign-planner')}
                        className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        + 建立第一個活動
                      </button>
                    </div>
                  ) : (
                    drafts.map(draft => (
                      <button
                        key={draft.id}
                        onClick={() => router.push(`/campaign-planner?id=${draft.id}`)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-800">{draft.name}</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ml-2">
                              {draft.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <span>{draft.inventoryCount} 個版位</span>
                            <span className="flex items-center gap-1">
                              {draft.uploadedCount === draft.totalCount && draft.totalCount > 0
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                              素材 {draft.uploadedCount}/{draft.totalCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-indigo-600">
                          繼續規劃 <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            {showProposals && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      專案提案
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">為客戶量身打造的報價與版位提案</p>
                  </div>
                  <button
                    onClick={() => router.push('/proposal-builder')}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 建立提案
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {proposals.length === 0 ? (
                    <div className="col-span-2 text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">目前沒有任何提案</p>
                    </div>
                  ) : (
                    proposals.map(proposal => (
                      <button
                        key={proposal.id}
                        onClick={() => router.push(`/proposal-builder?proposalId=${proposal.id}`)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-800">{proposal.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ml-2 ${
                              proposal.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              proposal.status.includes('approved') ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {proposal.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <span>總價: {proposal.finalQuote ? `NT$${proposal.finalQuote.toLocaleString()}` : '未定'}</span>
                            <span>{proposal.requestedDays ?? '未知'} 天走期</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
                          檢視提案 <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

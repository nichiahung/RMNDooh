'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, ShoppingCart, Loader2, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listCampaignSummaries } from '@/lib/api/campaign-draft';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import type { Proposal } from '@/types/trading-models';

export function WorkspacePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">DOOH Workspace</h1>
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                進入管理後台
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {showSelfService && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      自助購買 (Self-Service)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">規劃、選點、上傳素材並直接下單</p>
                  </div>
                  <button 
                    onClick={() => router.push('/campaign-planner')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 新增活動
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drafts.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">目前沒有任何活動草稿。</p>
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
                            <h3 className="font-semibold text-slate-800 text-lg">{draft.name}</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium capitalize">
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
                        <div className="flex items-center justify-between text-sm font-medium text-indigo-600">
                          繼續規劃 <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            {showProposals && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-500" />
                      專案提案 (Sales Proposals)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">為客戶量身打造的報價與版位提案</p>
                  </div>
                  <button 
                    onClick={() => router.push('/proposal-builder')}
                    className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 建立提案
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proposals.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">目前沒有任何提案。</p>
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
                            <h3 className="font-semibold text-slate-800 text-lg">{proposal.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
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
                        <div className="flex items-center justify-between text-sm font-medium text-emerald-600">
                          檢視提案 <ChevronRight className="w-4 h-4" />
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

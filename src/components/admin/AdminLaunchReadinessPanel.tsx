'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { listAdminLaunchReadinessApi, scheduleCampaignLaunchApi } from '@/lib/api/tradingIterationApi';
import type { CampaignReadinessResult } from '@/types/trading-models';

const CHECKLIST_ITEMS: Array<{ code: string; label: string }> = [
  { code: 'blocked_by_inventory', label: '庫存已鎖定 (Inventory Locked)' },
  { code: 'blocked_by_creative',  label: '素材已審核 (Creative Approved)' },
  { code: 'blocked_by_payment',   label: '付款已確認 (Payment Cleared)' },
  { code: 'blocked_by_policy',    label: '政策已通過 (Policy Passed)' },
  { code: 'blocked_by_playlist',  label: '播放清單已指派 (Playlist Assigned)' },
  { code: 'blocked_by_schedule',  label: '排程已設定 (Schedule Set)' },
];

export function AdminLaunchReadinessPanel() {
  const [data, setData] = useState<CampaignReadinessResult[] | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error'>>({});

  useEffect(() => { listAdminLaunchReadinessApi().then(setData); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">載入中...</div>;

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">無待上線活動</p>
        <p className="text-sm mt-1">確認訂單後，活動將出現在此處進行排程。</p>
      </div>
    );
  }

  async function handleSchedule(campaignId: string) {
    setScheduling(campaignId);
    try {
      await scheduleCampaignLaunchApi(campaignId);
      setResults(prev => ({ ...prev, [campaignId]: 'success' }));
    } catch {
      setResults(prev => ({ ...prev, [campaignId]: 'error' }));
    } finally {
      setScheduling(null);
    }
  }

  return (
    <div className="space-y-4">
      {data.map((campaign) => {
        const blockerCodes = new Set(campaign.blockers.map(b => b.code));
        const isReady = campaign.status === 'ready_for_launch' || campaign.status === 'ready_for_scheduling';
        const isScheduling = scheduling === campaign.campaignId;
        const result = results[campaign.campaignId];

        return (
          <div key={campaign.campaignId} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}…`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {campaign.readyLineItemIds.length} 條就緒 / {campaign.blockedLineItemIds.length} 條阻擋
                </p>
              </div>
              <div className="flex items-center gap-3">
                {result === 'success' && (
                  <span className="text-xs text-emerald-600 font-medium">✓ 排程成功</span>
                )}
                {result === 'error' && (
                  <span className="text-xs text-red-600 font-medium">排程失敗，請重試</span>
                )}
                <button
                  onClick={() => handleSchedule(campaign.campaignId)}
                  disabled={!isReady || isScheduling || result === 'success'}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isReady && result !== 'success'
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isScheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  排程上線
                </button>
              </div>
            </div>

            <ul className="px-5 py-3 space-y-2">
              {CHECKLIST_ITEMS.map(({ code, label }) => {
                const passed = !blockerCodes.has(code);
                return (
                  <li key={code} className="flex items-center gap-2.5 text-sm">
                    {passed
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    }
                    <span className={passed ? 'text-slate-600' : 'text-slate-500 line-through'}>
                      {label}
                    </span>
                    {!passed && (
                      <span className="text-xs text-red-500 ml-1">
                        {campaign.blockers.find(b => b.code === code)?.message}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

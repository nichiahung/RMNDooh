'use client';

import { useEffect, useState } from 'react';
import { listAdminLaunchReadinessApi } from '@/lib/api/tradingIterationApi';
import type { CampaignReadinessResult, LaunchReadinessStatus } from '@/types/trading-models';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  not_ready: { label: 'Not Ready', cls: 'bg-slate-100 text-slate-600' },
  partially_ready: { label: 'Partially Ready', cls: 'bg-amber-100 text-amber-700' },
  ready_for_confirmation: { label: 'Ready for Confirmation', cls: 'bg-blue-100 text-blue-700' },
  ready_for_scheduling: { label: 'Ready for Scheduling', cls: 'bg-indigo-100 text-indigo-700' },
  ready_for_launch: { label: 'Ready for Launch', cls: 'bg-emerald-100 text-emerald-700' },
  blocked_by_creative: { label: 'Blocked: Creative', cls: 'bg-red-100 text-red-700' },
  blocked_by_inventory: { label: 'Blocked: Inventory', cls: 'bg-red-100 text-red-700' },
  blocked_by_payment: { label: 'Blocked: Payment', cls: 'bg-red-100 text-red-700' },
  blocked_by_policy: { label: 'Blocked: Policy', cls: 'bg-red-100 text-red-700' },
  blocked_by_playlist: { label: 'Blocked: Playlist', cls: 'bg-red-100 text-red-700' },
  blocked_by_schedule: { label: 'Blocked: Schedule', cls: 'bg-red-100 text-red-700' },
};

export function AdminLaunchReadinessPanel() {
  const [data, setData] = useState<CampaignReadinessResult[] | null>(null);

  useEffect(() => { listAdminLaunchReadinessApi().then(setData); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading launch readiness data...</div>;

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No launch readiness data</p>
        <p className="text-sm mt-1">Create campaign drafts with inventory to see readiness status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((campaign) => {
        const badge = STATUS_BADGE[campaign.status] ?? { label: campaign.status, cls: 'bg-slate-100 text-slate-600' };
        return (
          <div key={campaign.campaignId} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}...`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {campaign.readyLineItemIds.length} ready / {campaign.blockedLineItemIds.length} blocked
                </p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            {campaign.blockers.length > 0 && (
              <div className="px-5 py-3 bg-red-50/50 border-b border-red-100">
                <div className="text-xs font-semibold text-red-700 mb-1">Blocking Reasons:</div>
                <ul className="space-y-0.5">
                  {campaign.blockers.map((blocker, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {blocker.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="px-5 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-emerald-50">
                  <div className="text-lg font-bold text-emerald-700">{campaign.readyLineItemIds.length}</div>
                  <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-medium">Ready</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <div className="text-lg font-bold text-red-700">{campaign.blockedLineItemIds.length}</div>
                  <div className="text-[10px] text-red-600 uppercase tracking-wider font-medium">Blocked</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

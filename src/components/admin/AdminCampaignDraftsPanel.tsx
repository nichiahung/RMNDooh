'use client';

import { useEffect, useState } from 'react';
import { listAdminCampaignDraftsApi } from '@/lib/api/tradingIterationApi';
import type { CampaignDraftProfile, CampaignDraftStatus } from '@/types/trading-models';

const STATUS_BADGE: Record<CampaignDraftStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  submitted_for_review: { label: 'Submitted', cls: 'bg-purple-100 text-purple-700' },
  ready_to_confirm: { label: 'Ready', cls: 'bg-emerald-100 text-emerald-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-200 text-slate-500' },
};

export function AdminCampaignDraftsPanel() {
  const [drafts, setDrafts] = useState<CampaignDraftProfile[] | null>(null);

  useEffect(() => { listAdminCampaignDraftsApi().then(setDrafts); }, []);

  if (!drafts) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading campaign drafts...</div>;

  if (drafts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No campaign drafts yet</p>
        <p className="text-sm mt-1">Self-service campaign drafts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Draft Name</th>
            <th className="px-4 py-3">Advertiser</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Buying Method</th>
            <th className="px-4 py-3">Flight</th>
            <th className="px-4 py-3">Est. Budget</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => {
            const badge = STATUS_BADGE[d.status] ?? { label: d.status, cls: 'bg-slate-100 text-slate-600' };
            return (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-500">{d.advertiserId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 capitalize">{d.buyingMethod?.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {d.requestedStartDate ?? '—'} → {d.requestedEndDate ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {d.estimatedBudget > 0 ? `NT$${d.estimatedBudget.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(d.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

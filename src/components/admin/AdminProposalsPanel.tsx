'use client';

import { useEffect, useState } from 'react';
import { listAdminProposalsApi } from '@/lib/api/tradingIterationApi';
import type { Proposal, ProposalStatus } from '@/types/trading-models';
import { resolveAdvertiserName } from '@/utils/adminResolvers';

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  sent_to_advertiser: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  viewed_by_advertiser: { label: 'Viewed', cls: 'bg-sky-100 text-sky-700' },
  commented: { label: 'Commented', cls: 'bg-amber-100 text-amber-700' },
  change_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
  revised: { label: 'Revised', cls: 'bg-indigo-100 text-indigo-700' },
  approved_by_advertiser: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Expired', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-200 text-slate-500' },
};

export function AdminProposalsPanel() {
  const [data, setData] = useState<{ proposals: Proposal[]; countsByStatus: Record<ProposalStatus, number> } | null>(null);

  useEffect(() => { listAdminProposalsApi().then(setData); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading proposals...</div>;

  if (data.proposals.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No proposals yet</p>
        <p className="text-sm mt-1">Proposals created via the Sales Builder will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Proposal</th>
            <th className="px-4 py-3">Advertiser</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Flight</th>
            <th className="px-4 py-3">Quote</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {data.proposals.map((p) => {
            const badge = STATUS_BADGE[p.status];
            return (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600 font-medium">
                  {resolveAdvertiserName(p.advertiserId)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {p.requestedStartDate ?? '—'} → {p.requestedEndDate ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {p.finalQuote != null ? `NT$${p.finalQuote.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

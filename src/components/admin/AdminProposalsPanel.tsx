'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  listAdminProposalsApi,
  markProposalRevisedApi,
  adminSendProposalToAdvertiserApi,
  confirmProposalBookingApi,
} from '@/lib/api/tradingIterationApi';
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

export function AdminProposalsPanel({ statusFilter }: { statusFilter?: string | null }) {
  const [data, setData] = useState<{ proposals: Proposal[]; countsByStatus: Record<ProposalStatus, number> } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  useEffect(() => { listAdminProposalsApi().then(setData); }, []);

  async function handleSendToAdvertiser(proposalId: string) {
    setActionInProgress(proposalId);
    setActionErrors(prev => { const next = { ...prev }; delete next[proposalId]; return next; });
    try {
      await adminSendProposalToAdvertiserApi(proposalId);
      const fresh = await listAdminProposalsApi();
      setData(fresh);
    } catch {
      setActionErrors(prev => ({ ...prev, [proposalId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleMarkRevised(proposalId: string) {
    setActionInProgress(proposalId);
    setActionErrors(prev => { const next = { ...prev }; delete next[proposalId]; return next; });
    try {
      await markProposalRevisedApi(proposalId);
      const fresh = await listAdminProposalsApi();
      setData(fresh);
    } catch {
      setActionErrors(prev => ({ ...prev, [proposalId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleConvertToBooking(proposalId: string) {
    setActionInProgress(proposalId);
    setActionErrors(prev => { const next = { ...prev }; delete next[proposalId]; return next; });
    try {
      await confirmProposalBookingApi(proposalId);
      const fresh = await listAdminProposalsApi();
      setData(fresh);
    } catch {
      setActionErrors(prev => ({ ...prev, [proposalId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  }

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading proposals...</div>;

  const proposalsToRender = data.proposals.filter(p => !statusFilter || p.status === statusFilter);

  if (proposalsToRender.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No proposals found</p>
        <p className="text-sm mt-1">
          {statusFilter ? `No proposals matching filter: ${statusFilter}` : 'Proposals created via the Sales Builder will appear here.'}
        </p>
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
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {proposalsToRender.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const isLoading = actionInProgress === p.id;
            const error = actionErrors[p.id];
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.status === 'draft' && (
                      <button
                        onClick={() => handleSendToAdvertiser(p.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Send to Advertiser
                      </button>
                    )}
                    {p.status === 'change_requested' && (
                      <button
                        onClick={() => handleMarkRevised(p.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Mark Revised
                      </button>
                    )}
                    {p.status === 'approved_by_advertiser' && (
                      <button
                        onClick={() => handleConvertToBooking(p.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Convert to Booking
                      </button>
                    )}
                    {!['draft', 'change_requested', 'approved_by_advertiser'].includes(p.status) && (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                    {error && <span className="text-red-500 text-xs">{error}</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

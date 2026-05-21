'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminCampaignDraftsApi, confirmCampaignDraftBookingApi } from '@/lib/api/tradingIterationApi';
import type { CampaignDraftProfile, CampaignDraftStatus } from '@/types/trading-models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { resolveAdvertiserName } from '@/utils/adminResolvers';

const DRAFT_STATUS_MAP: Record<CampaignDraftStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  submitted_for_review: { label: 'Submitted', cls: 'bg-purple-100 text-purple-700' },
  ready_to_confirm: { label: 'Ready', cls: 'bg-emerald-100 text-emerald-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-200 text-slate-500' },
};

const DRAFT_STATUS_CLS: Record<CampaignDraftStatus, string> = Object.fromEntries(
  Object.entries(DRAFT_STATUS_MAP).map(([k, v]) => [k, v.cls])
) as Record<CampaignDraftStatus, string>;

export function AdminCampaignDraftsPanel({ statusFilter }: { statusFilter?: string | null }) {
  const [drafts, setDrafts] = useState<CampaignDraftProfile[] | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const refresh = () => {
    listAdminCampaignDraftsApi().then(setDrafts);
  };

  useEffect(() => { refresh(); }, []);

  const handleConfirmBooking = async (draftId: string) => {
    setActionInProgress(draftId);
    try {
      await confirmCampaignDraftBookingApi(draftId);
      refresh();
    } catch {
      alert('操作失敗');
    } finally {
      setActionInProgress(null);
    }
  };

  if (!drafts) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading campaign drafts...</div>;

  const draftsToRender = drafts.filter(d => !statusFilter || d.status === statusFilter);

  if (draftsToRender.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No campaign drafts found</p>
        <p className="text-sm mt-1">
          {statusFilter ? `No drafts matching filter: ${statusFilter}` : 'Self-service campaign drafts will appear here.'}
        </p>
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
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {draftsToRender.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
              <td className="px-4 py-3 text-slate-600 font-medium">
                {resolveAdvertiserName(d.advertiserId)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={d.status} map={DRAFT_STATUS_CLS} label={DRAFT_STATUS_MAP[d.status]?.label} shape="pill" />
              </td>
              <td className="px-4 py-3 text-slate-500 capitalize">{d.buyingMethod?.replace('_', ' ')}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {d.requestedStartDate ?? '—'} → {d.requestedEndDate ?? '—'}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {d.estimatedBudget > 0 ? `NT$${d.estimatedBudget.toLocaleString()}` : '—'}
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">{new Date(d.updatedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {(d.status === 'submitted_for_review' || d.status === 'ready_to_confirm') && (
                    <button
                      onClick={() => handleConfirmBooking(d.id)}
                      disabled={actionInProgress === d.id}
                      className="px-3 py-1 text-xs rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {actionInProgress === d.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      Confirm Booking
                    </button>
                  )}
                  {d.status === 'confirmed' && (
                    <span className="text-emerald-600 text-xs font-semibold">✓ Confirmed</span>
                  )}
                  {!['submitted_for_review', 'ready_to_confirm', 'confirmed'].includes(d.status) && (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

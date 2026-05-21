'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  listAdminBookingsApi,
  confirmBookingActionApi,
  markPaymentClearedApi,
  cancelBookingActionApi,
  listAdminProposalsApi,
  listAdminCampaignDraftsApi,
} from '@/lib/api/tradingIterationApi';
import type { BookingRow, Proposal, CampaignDraftProfile } from '@/types/trading-models';
import { StatusBadge } from '@/components/ui/StatusBadge';

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  proposal: { label: 'Proposal', cls: 'bg-blue-100 text-blue-700' },
  self_service: { label: 'Self-Service', cls: 'bg-emerald-100 text-emerald-700' },
  manual_admin: { label: 'Manual', cls: 'bg-amber-100 text-amber-700' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-800' },
  inventory_reserved: { label: 'Reserved', cls: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Scheduled', cls: 'bg-indigo-100 text-indigo-700' },
  live: { label: 'Live', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', cls: 'bg-red-100 text-red-700' },
};

const BOOL_MAP: Record<string, string> = {
  true: 'bg-emerald-100 text-emerald-700',
  false: 'bg-red-100 text-red-700',
};

function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <StatusBadge
      value={String(value)}
      map={BOOL_MAP}
      label={value ? trueLabel : falseLabel}
      shape="pill"
    />
  );
}

export function AdminBookingsPanel({ statusFilter }: { statusFilter?: string | null }) {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [drafts, setDrafts] = useState<CampaignDraftProfile[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [cancelConfirming, setCancelConfirming] = useState<string | null>(null);

  const refresh = () => {
    listAdminBookingsApi().then(setBookings);
  };

  useEffect(() => {
    refresh();
    listAdminProposalsApi().then(res => setProposals(res.proposals));
    listAdminCampaignDraftsApi().then(setDrafts);
  }, []);

  const handleConfirm = async (bookingId: string) => {
    setActionInProgress(bookingId);
    setActionErrors(prev => { const next = { ...prev }; delete next[bookingId]; return next; });
    try {
      await confirmBookingActionApi(bookingId);
      refresh();
    } catch {
      setActionErrors(prev => ({ ...prev, [bookingId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkPayment = async (bookingId: string) => {
    setActionInProgress(bookingId);
    setActionErrors(prev => { const next = { ...prev }; delete next[bookingId]; return next; });
    try {
      await markPaymentClearedApi(bookingId);
      refresh();
    } catch {
      setActionErrors(prev => ({ ...prev, [bookingId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelConfirm = async (bookingId: string) => {
    setActionInProgress(bookingId);
    setActionErrors(prev => { const next = { ...prev }; delete next[bookingId]; return next; });
    try {
      await cancelBookingActionApi(bookingId);
      setCancelConfirming(null);
      refresh();
    } catch {
      setActionErrors(prev => ({ ...prev, [bookingId]: '操作失敗' }));
    } finally {
      setActionInProgress(null);
    }
  };

  if (!bookings) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading bookings...</div>;

  const bookingsToRender = bookings.filter(b => !statusFilter || b.bookingStatus === statusFilter);

  if (bookingsToRender.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No bookings found</p>
        <p className="text-sm mt-1">
          {statusFilter ? `No bookings matching filter: ${statusFilter}` : 'Bookings from proposals or confirmed campaign drafts will appear here.'}
        </p>
      </div>
    );
  }

  // Helper to resolve friendly source name
  const resolveSourceName = (b: BookingRow) => {
    if (b.bookingSource === 'proposal') {
      const prop = proposals.find(p => p.id === b.proposalId || p.id === b.sourceId);
      return prop ? `[提案] ${prop.name}` : `Proposal ${b.proposalId?.slice(0, 5) ?? '—'}`;
    }
    if (b.bookingSource === 'self_service') {
      const draft = drafts.find(d => d.id === b.campaignDraftId || d.id === b.sourceId);
      return draft ? `[草稿] ${draft.name}` : `Draft ${b.campaignDraftId?.slice(0, 5) ?? '—'}`;
    }
    return `Manual Booking`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Booking ID</th>
            <th className="px-4 py-3">Campaign / Proposal</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Inventory</th>
            <th className="px-4 py-3">Playlist</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Policy</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookingsToRender.map((b) => {
            const sourceBadge = SOURCE_BADGE[b.bookingSource] ?? { label: b.bookingSource, cls: 'bg-slate-100 text-slate-600' };
            const statusBadge = STATUS_BADGE[b.bookingStatus] ?? { label: b.bookingStatus, cls: 'bg-slate-100 text-slate-600' };
            const isInFlight = actionInProgress === b.id;
            const errorMsg = actionErrors[b.id];
            const showCancelConfirm = cancelConfirming === b.id;
            const canAct = b.bookingStatus === 'inventory_reserved' || b.bookingStatus === 'confirmed';

            return (
              <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  <span title={b.id}>{b.id.slice(0, 8)}…</span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {resolveSourceName(b)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sourceBadge.cls}`}>{sourceBadge.label}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{b.inventoryIds.length} locations</td>
                <td className="px-4 py-3">
                  <BoolBadge value={b.playlistAssigned} trueLabel="Assigned" falseLabel="Missing" />
                </td>
                <td className="px-4 py-3">
                  <BoolBadge value={b.paymentCleared} trueLabel="Cleared" falseLabel="Pending" />
                </td>
                <td className="px-4 py-3">
                  <BoolBadge value={b.policyPassed} trueLabel="Passed" falseLabel="Failed" />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {!canAct ? (
                    <span className="text-slate-300 text-xs">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {errorMsg && (
                        <span className="text-red-500 text-xs">{errorMsg}</span>
                      )}
                      {showCancelConfirm ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-600 mr-1">確認取消?</span>
                          <button
                            disabled={isInFlight}
                            onClick={() => handleCancelConfirm(b.id)}
                            className="px-3 py-1 text-xs rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isInFlight && <Loader2 className="w-3 h-3 animate-spin" />}
                            是
                          </button>
                          <button
                            disabled={isInFlight}
                            onClick={() => setCancelConfirming(null)}
                            className="px-3 py-1 text-xs rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                          >
                            否
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {b.bookingStatus === 'inventory_reserved' && (
                            <button
                              disabled={isInFlight}
                              onClick={() => handleConfirm(b.id)}
                              className="px-3 py-1 text-xs rounded-lg font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isInFlight && <Loader2 className="w-3 h-3 animate-spin" />}
                              Confirm Booking
                            </button>
                          )}
                          {b.bookingStatus === 'confirmed' && !b.paymentCleared && (
                            <button
                              disabled={isInFlight}
                              onClick={() => handleMarkPayment(b.id)}
                              className="px-3 py-1 text-xs rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isInFlight && <Loader2 className="w-3 h-3 animate-spin" />}
                              Mark Payment Cleared
                            </button>
                          )}
                          <button
                            disabled={isInFlight}
                            onClick={() => setCancelConfirming(b.id)}
                            className="px-3 py-1 text-xs rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

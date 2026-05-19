'use client';

import { useEffect, useState } from 'react';
import { listAdminBookingsApi } from '@/lib/api/tradingIterationApi';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface BookingRow {
  id: string;
  bookingStatus: string;
  bookingSource: string;
  sourceType: string;
  sourceId: string;
  campaignId: string | null;
  proposalId: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryIds: string[];
  playlistAssigned: boolean;
  paymentCleared: boolean;
  policyPassed: boolean;
}

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

export function AdminBookingsPanel() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);

  useEffect(() => { listAdminBookingsApi().then(setBookings as (data: unknown) => void); }, []);

  if (!bookings) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading bookings...</div>;

  if (bookings.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No bookings yet</p>
        <p className="text-sm mt-1">Bookings from proposals or confirmed campaign drafts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Booking ID</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Inventory</th>
            <th className="px-4 py-3">Playlist</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Policy</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const sourceBadge = SOURCE_BADGE[b.bookingSource] ?? { label: b.bookingSource, cls: 'bg-slate-100 text-slate-600' };
            const statusBadge = STATUS_BADGE[b.bookingStatus] ?? { label: b.bookingStatus, cls: 'bg-slate-100 text-slate-600' };
            return (
              <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  <span title={b.id}>{b.id.slice(0, 8)}…</span>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

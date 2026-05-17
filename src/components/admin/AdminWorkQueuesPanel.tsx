'use client';

import { useEffect, useState } from 'react';
import { FileText, ClipboardList, CalendarCheck, ImageIcon, CheckCircle, Rocket, AlertTriangle } from 'lucide-react';
import { getAdminDashboardWorkQueuesApi } from '@/lib/api/tradingIterationApi';

interface WorkQueues {
  needsSalesAction: number;
  needsBookingAction: number;
  needsCreativeReview: number;
  needsCreativeCoverage: number;
  needsLaunchAction: number;
  updatedAt: string;
}

export function AdminWorkQueuesPanel() {
  const [queues, setQueues] = useState<WorkQueues | null>(null);

  useEffect(() => {
    getAdminDashboardWorkQueuesApi().then(setQueues);
  }, []);

  if (!queues) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading work queues...</div>;

  const cards = [
    { label: 'Needs Sales Action', value: queues.needsSalesAction, icon: FileText, color: 'bg-blue-500/10 text-blue-500', ring: 'ring-blue-500/20' },
    { label: 'Needs Booking Action', value: queues.needsBookingAction, icon: CalendarCheck, color: 'bg-amber-500/10 text-amber-500', ring: 'ring-amber-500/20' },
    { label: 'Needs Creative Review', value: queues.needsCreativeReview, icon: ClipboardList, color: 'bg-purple-500/10 text-purple-500', ring: 'ring-purple-500/20' },
    { label: 'Needs Creative Coverage', value: queues.needsCreativeCoverage, icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500', ring: 'ring-emerald-500/20' },
    { label: 'Needs Launch Action', value: queues.needsLaunchAction, icon: Rocket, color: 'bg-rose-500/10 text-rose-500', ring: 'ring-rose-500/20' },
  ];

  const hasUrgent = cards.some(c => c.value > 0);

  return (
    <div className="space-y-6">
      {hasUrgent && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>There are items requiring attention across the platform.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ${card.ring}`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-400">
        Last updated: {new Date(queues.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}

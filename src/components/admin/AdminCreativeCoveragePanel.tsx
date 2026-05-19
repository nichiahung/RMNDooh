'use client';

import { useEffect, useState } from 'react';
import { listAdminCreativeCoverageApi } from '@/lib/api/tradingIterationApi';

interface CoverageResult {
  campaignId: string;
  campaignName?: string;
  requirements: Array<{
    id: string;
    canonicalFormat: string;
    status: string;
    venueCount: number;
  }>;
  requirementCoverageMatrix: Array<{
    requirementId: string;
    requirement: { id: string; canonicalFormat: string; status: string };
    missingInventoryIds: string[];
  }>;
}

const STATUS_COLOR: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  uploaded: 'bg-blue-100 text-blue-700',
  missing: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  pending_review: 'bg-amber-100 text-amber-700',
};

export function AdminCreativeCoveragePanel() {
  const [data, setData] = useState<CoverageResult[] | null>(null);

  useEffect(() => { listAdminCreativeCoverageApi().then(setData as (d: unknown) => void); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading coverage data...</div>;

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">No creative coverage data</p>
        <p className="text-sm mt-1">Create campaign drafts with inventory to see coverage analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((campaign) => (
        <div key={campaign.campaignId} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">
              {campaign.campaignName ?? `Campaign ${campaign.campaignId.slice(0, 8)}...`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{campaign.requirements.length} requirements</p>
          </div>

          {campaign.requirements.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No creative requirements generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Format</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Venues</th>
                    <th className="px-5 py-3">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.requirements.map((req) => {
                    const matrix = campaign.requirementCoverageMatrix.find(m => m.requirementId === req.id);
                    const missingCount = matrix?.missingInventoryIds.length ?? 0;
                    return (
                      <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">{req.canonicalFormat.replace(/_/g, ' ')}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[req.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{req.venueCount}</td>
                        <td className="px-5 py-3">
                          {missingCount > 0 ? (
                            <span className="text-red-600 font-medium">{missingCount} missing</span>
                          ) : (
                            <span className="text-emerald-600">✓ covered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

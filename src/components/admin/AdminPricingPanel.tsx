'use client';

import { useEffect, useState } from 'react';
import { listAdminPricingApi } from '@/lib/api/tradingIterationApi';
import type { PriceBook, PriceBookItem, PricingRule, PricingApprovalRequest } from '@/types/trading-models';

type PricingTab = 'price-books' | 'items' | 'rules' | 'approval-queue';

const PRICE_BOOK_TYPE_LABEL: Record<string, string> = {
  self_service_msrp: 'Self-Service MSRP',
  sales_rate_card: 'Sales Rate Card',
  vip_rate_card: 'VIP Rate Card',
  agency_rate_card: 'Agency Rate Card',
  seasonal_rate_card: 'Seasonal',
  manual_override: 'Manual Override',
};

export function AdminPricingPanel() {
  const [data, setData] = useState<{
    priceBooks: PriceBook[];
    priceBookItems: PriceBookItem[];
    pricingRules: PricingRule[];
    approvalQueue: PricingApprovalRequest[];
  } | null>(null);
  const [tab, setTab] = useState<PricingTab>('price-books');

  useEffect(() => { listAdminPricingApi().then(setData); }, []);

  if (!data) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading pricing data...</div>;

  const tabs: { id: PricingTab; label: string; count?: number }[] = [
    { id: 'price-books', label: 'Price Books', count: data.priceBooks.length },
    { id: 'items', label: 'Items', count: data.priceBookItems.length },
    { id: 'rules', label: 'Rules', count: data.pricingRules.length },
    { id: 'approval-queue', label: 'Approval Queue', count: data.approvalQueue.filter(r => r.status === 'required' || r.status === 'pending').length },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-white border border-b-0 border-slate-200 text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'price-books' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Effective</th>
              </tr>
            </thead>
            <tbody>
              {data.priceBooks.map((pb) => (
                <tr key={pb.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{pb.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{pb.code}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{PRICE_BOOK_TYPE_LABEL[pb.priceBookType] ?? pb.priceBookType}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs capitalize">{pb.visibility.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-500">{pb.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${pb.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {pb.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{pb.effectiveStartDate} — {pb.effectiveEndDate ?? '∞'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'items' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Price Book</th>
                <th className="px-4 py-3">Inventory</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Base Price</th>
                <th className="px-4 py-3">Min Days</th>
                <th className="px-4 py-3">Est. CPM</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.priceBookItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.priceBookId}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.inventoryLocationId ?? 'All'}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize text-xs">{item.billingUnit.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">NT${item.basePrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{item.minimumDays}</td>
                  <td className="px-4 py-3 text-slate-500">NT${item.estimatedCpm}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rules' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price Book</th>
                <th className="px-4 py-3">Payload</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.pricingRules.map((rule) => (
                <tr key={rule.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize text-xs">{rule.ruleType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{rule.appliesToPriceBookId ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[200px] truncate">{JSON.stringify(rule.rulePayload)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${rule.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approval-queue' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Requested Price</th>
                <th className="px-4 py-3">Floor Price</th>
                <th className="px-4 py-3">Discount %</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.approvalQueue.map((req) => (
                <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{req.id}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{req.proposalId ?? req.campaignId ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">NT${req.requestedPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{req.floorPrice != null ? `NT$${req.floorPrice.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{req.discountPercent != null ? `${req.discountPercent}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      req.status === 'required' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{req.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

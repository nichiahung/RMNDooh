'use client';

import { useState } from 'react';
import { Campaign } from '@/types/inventory';
import { formatCurrency } from '@/utils/formatters';
import { Search } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

interface Props {
  campaigns: Campaign[];
  onViewDetails: (campaign: Campaign) => void;
  onConfirmBooking?: (campaignId: string) => void;
}

const BOOKING_BADGE: Record<string, string> = {
  draft:                'bg-slate-100 text-slate-600',
  pending_creative:     'bg-orange-100 text-orange-700 border border-orange-200',
  pending_review:       'bg-amber-100 text-amber-700 border border-amber-200',
  pending_confirmation: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  confirmed:            'bg-emerald-100 text-emerald-700',
  scheduled:            'bg-blue-100 text-blue-700',
  live:                 'bg-indigo-100 text-indigo-700',
  completed:            'bg-slate-200 text-slate-700',
  cancelled:            'bg-gray-100 text-gray-500',
  blocked:              'bg-red-100 text-red-700 border border-red-200',
};

const CREATIVE_BADGE: Record<string, string> = {
  not_submitted:             'bg-slate-100 text-slate-500',
  pending_review:            'bg-amber-100 text-amber-700',
  approved:                  'bg-emerald-100 text-emerald-700',
  approved_with_restrictions:'bg-teal-100 text-teal-700',
  rejected:                  'bg-red-100 text-red-700',
  expired:                   'bg-orange-100 text-orange-700',
};

const LAUNCH_BADGE: Record<string, string> = {
  not_ready:              'bg-slate-100 text-slate-500',
  ready_for_confirmation: 'bg-yellow-100 text-yellow-700',
  ready_for_scheduling:   'bg-blue-100 text-blue-700',
  ready_for_launch:       'bg-emerald-100 text-emerald-700',
  blocked_by_creative:    'bg-red-100 text-red-700',
  blocked_by_inventory:   'bg-orange-100 text-orange-700',
  blocked_by_payment:     'bg-purple-100 text-purple-700',
  blocked_by_policy:      'bg-red-200 text-red-800',
};

export function CampaignTable({ campaigns, onViewDetails, onConfirmBooking }: Props) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCampaigns = campaigns.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.advertiserName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">

      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.campaigns.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">{t('admin.campaigns.col.name')}</th>
              <th className="px-6 py-4 font-semibold">{t('admin.campaigns.col.advertiser')}</th>
              <th className="px-6 py-4 font-semibold">訂單</th>
              <th className="px-6 py-4 font-semibold">素材</th>
              <th className="px-6 py-4 font-semibold">上線準備</th>
              <th className="px-6 py-4 font-semibold text-right">{t('admin.campaigns.col.budget')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('admin.campaigns.col.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredCampaigns.map(campaign => (
              <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{campaign.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t('admin.campaigns.submitted')} {new Date(campaign.submittedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{campaign.advertiserName}</td>
                <td className="px-6 py-4">
                  <StatusBadge value={campaign.bookingStatus} map={BOOKING_BADGE} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge value={campaign.creativeStatus} map={CREATIVE_BADGE} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge value={campaign.launchReadiness} map={LAUNCH_BADGE} />
                </td>
                <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                  {formatCurrency(campaign.estimatedBudget)}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {/* Confirm booking button — shown when creative approved, booking pending confirmation */}
                  {campaign.bookingStatus === 'pending_confirmation' &&
                   campaign.creativeStatus === 'approved' &&
                   onConfirmBooking && (
                    <button
                      onClick={() => onConfirmBooking(campaign.id)}
                      className="text-emerald-600 hover:text-emerald-800 font-medium text-xs px-3 py-1.5 border border-emerald-200 rounded-md hover:bg-emerald-50 transition-colors"
                    >
                      確認訂單
                    </button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onViewDetails(campaign)}>
                    {t('admin.campaigns.viewDetails')}
                  </Button>
                </td>
              </tr>
            ))}
            {filteredCampaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  {t('admin.campaigns.noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

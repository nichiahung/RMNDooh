'use client';

import { LocationDeliveryData, DeliveryStatus } from '@/types/inventory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  data: LocationDeliveryData[];
}

export function PlaysByLocationTable({ data }: Props) {
  const { t } = useI18n();

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'on_track':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t('reports.status.onTrack')}</span>;
      case 'under_delivering':
        return <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-200">{t('reports.status.underDelivering')}</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t('reports.status.completed')}</span>;
      case 'paused':
        return <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{t('reports.status.paused')}</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <table className="w-full text-sm text-left whitespace-nowrap">
      <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
        <tr>
          <th className="px-5 py-3 font-semibold">{t('reports.location.col.location')}</th>
          <th className="px-5 py-3 font-semibold text-right">{t('reports.location.col.screens')}</th>
          <th className="px-5 py-3 font-semibold text-right">{t('reports.location.col.plays')}</th>
          <th className="px-5 py-3 font-semibold text-right">{t('reports.location.col.estImp')}</th>
          <th className="px-5 py-3 font-semibold text-right">{t('reports.location.col.spend')}</th>
          <th className="px-5 py-3 font-semibold">{t('reports.location.col.status')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {data.map((item, i) => (
          <tr key={i} className="hover:bg-slate-50 transition-colors">
            <td className="px-5 py-3">
              <div className="font-semibold text-slate-900">{item.locationName}</div>
              <div className="text-xs text-slate-500">{item.district}</div>
            </td>
            <td className="px-5 py-3 text-right text-slate-600">{item.screenCount}</td>
            <td className="px-5 py-3 text-right font-medium text-slate-900">{formatNumber(item.plays)}</td>
            <td className="px-5 py-3 text-right text-indigo-600 font-medium">{formatNumber(item.estimatedImpressions)}</td>
            <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(item.budgetSpent)}</td>
            <td className="px-5 py-3">{getStatusBadge(item.status)}</td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-8 text-center text-slate-500">{t('reports.location.noData')}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

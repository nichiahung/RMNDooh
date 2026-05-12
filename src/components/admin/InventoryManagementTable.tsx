'use client';

import { InventoryLocation } from '@/types/inventory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Search, Edit } from 'lucide-react';
import { imgSrc } from '@/utils/imgSrc';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  inventory: InventoryLocation[];
}

export function InventoryManagementTable({ inventory }: Props) {
  const { t } = useI18n();

  const getAvailabilityBadge = (av: number) => {
    if (av >= 0.7) return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">{t('admin.inventory.availHigh')} ({Math.round(av*100)}%)</span>;
    if (av >= 0.3) return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">{t('admin.inventory.availLimited')} ({Math.round(av*100)}%)</span>;
    return <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">{t('admin.inventory.availLow')} ({Math.round(av*100)}%)</span>;
  };

  return (
    <div className="flex flex-col h-full">

      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('admin.inventory.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-indigo-700 transition-colors">
            {t('admin.inventory.addLocation')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">{t('admin.inventory.col.location')}</th>
              <th className="px-6 py-4 font-semibold">{t('admin.inventory.col.district')}</th>
              <th className="px-6 py-4 font-semibold">{t('admin.inventory.col.type')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('admin.inventory.col.dailyImp')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('admin.inventory.col.pricePerDay')}</th>
              <th className="px-6 py-4 font-semibold">{t('admin.inventory.col.availability')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('admin.inventory.col.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden mr-3 flex-shrink-0">
                      <img src={imgSrc(item.imageUrl)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.district}</td>
                <td className="px-6 py-4">
                  <div className="text-slate-900">{item.screenType}</div>
                  <div className="text-xs text-slate-500">{item.venueType}</div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-900">{formatNumber(item.dailyImpressions)}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.pricePerDay)}</td>
                <td className="px-6 py-4">{getAvailabilityBadge(item.availability)}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors" title="Edit Mock">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

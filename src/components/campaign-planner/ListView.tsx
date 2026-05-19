'use client';

import { ChevronDown } from 'lucide-react';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';
import { isInMediaPlan } from '@/utils/mediaPlanCalculations';
import { useI18n } from '@/i18n/I18nProvider';
import { getSortLabelCompact } from '@/utils/sortLabel';

interface Props {
  inventory: InventoryLocation[];
  sortOption: string;
  onSortChange: (option: string) => void;
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  onRemove?: (inventoryId: string) => void;
  objective?: string;
}

const SORT_OPTIONS = [
  { value: 'impressions_desc', key: 'sort.impressionsDesc' },
  { value: 'impressions_asc', key: 'sort.impressionsAsc' },
  { value: 'price_desc', key: 'sort.priceDesc' },
  { value: 'price_asc', key: 'sort.priceAsc' },
  { value: 'cpm_desc', key: 'sort.cpmDesc' },
  { value: 'cpm_asc', key: 'sort.cpmAsc' },
] as const;

export function ListView({
  inventory,
  sortOption,
  onSortChange,
  selectedItems,
  onViewDetails,
  onAdd,
  onRemove,
  objective,
}: Props) {
  const { t } = useI18n();
  const selectedInCurrentResults = inventory.filter(item =>
    isInMediaPlan(selectedItems, item.id)
  ).length;

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">{t('list.noResults')}</p>
          <p className="text-sm text-slate-500">{t('list.noResultsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex h-9 items-center justify-between gap-3 text-xs text-slate-500 sm:text-sm">
        <div className="min-w-0 truncate">
          <span className="font-medium text-slate-700">{inventory.length} 筆結果</span>
          {selectedInCurrentResults > 0 && (
            <span className="ml-1">· 已加入 {selectedInCurrentResults}</span>
          )}
        </div>

        <div className="relative flex h-9 w-32 flex-shrink-0 items-center justify-end">
          <div className="flex h-full w-full items-center justify-end gap-1 rounded-md pr-5 text-xs font-medium text-slate-600 pointer-events-none select-none">
            <span className="min-w-0 truncate">{getSortLabelCompact(sortOption)}</span>
            <ChevronDown className="absolute right-0 h-3.5 w-3.5 text-slate-400" />
          </div>
          <select
            aria-label="Sort inventory"
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{t(o.key)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {inventory.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            isSelected={isInMediaPlan(selectedItems, item.id)}
            onViewDetails={() => onViewDetails(item)}
            onAdd={() => onAdd(item)}
            onRemove={onRemove ? () => onRemove(item.id) : undefined}
            objective={objective}
          />
        ))}
      </div>
    </div>
  );
}

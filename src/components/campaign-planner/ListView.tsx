'use client';

import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';
import { isInMediaPlan } from '@/utils/mediaPlanCalculations';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
  objective?: string;
  reserveFilterSpace?: boolean;
}

export function ListView({ inventory, selectedItems, onViewDetails, onAdd, objective, reserveFilterSpace = false }: Props) {
  const { t } = useI18n();

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
    <div className={`p-4 sm:p-6 ${reserveFilterSpace ? 'pt-18 pl-4 sm:pt-6 sm:pl-36' : ''}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {inventory.map((item) => (
          <InventoryCard
            key={item.id}
            item={item}
            isSelected={isInMediaPlan(selectedItems, item.id)}
            onViewDetails={() => onViewDetails(item)}
            onAdd={() => onAdd(item)}
            objective={objective}
          />
        ))}
      </div>
    </div>
  );
}

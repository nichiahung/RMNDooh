'use client';

import { InventoryLocation } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  items: InventoryLocation[];
  onItemClick: (item: InventoryLocation) => void;
}

export function ListView({ items, onItemClick }: Props) {
  const { t } = useI18n();

  if (items.length === 0) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item) => (
          <InventoryCard key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

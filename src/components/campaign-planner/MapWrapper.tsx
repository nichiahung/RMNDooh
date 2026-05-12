'use client';

import dynamic from 'next/dynamic';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { useI18n } from '@/i18n/I18nProvider';

function MapLoadingPlaceholder() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center h-full w-full bg-slate-100">
      <div className="text-sm text-slate-500 animate-pulse">{t('map.loading')}</div>
    </div>
  );
}

const MapView = dynamic(
  () => import('./MapView').then(mod => mod.MapView),
  { ssr: false, loading: () => <MapLoadingPlaceholder /> }
);

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
}

export function MapWrapper({ inventory, selectedItems, onViewDetails }: Props) {
  return <MapView inventory={inventory} selectedItems={selectedItems} onViewDetails={onViewDetails} />;
}

'use client';

import { InventoryLocation } from '@/types/inventory';
import { usePlannerStore } from '@/store/usePlannerStore';
import { InventoryCard as BaseCard } from '@/components/campaign-planner/InventoryCard';

interface Props {
  item: InventoryLocation;
  onClick?: (item: InventoryLocation) => void;
}

export function InventoryCard({ item, onClick }: Props) {
  const { selectedItems, addToMediaPlan, removeFromMediaPlan } = usePlannerStore();
  const isSelected = selectedItems.some((s) => s.inventoryId === item.id);

  return (
    <BaseCard
      item={item}
      isSelected={isSelected}
      onViewDetails={() => onClick?.(item)}
      onAdd={() => {
        if (isSelected) removeFromMediaPlan(item.id);
        else addToMediaPlan(item.id, 7);
      }}
    />
  );
}

'use client';

import dynamic from 'next/dynamic';
import type { InventoryLocation } from '@/types/inventory';

interface Props {
  locations: InventoryLocation[];
}

function MiniMapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[11px] font-medium text-slate-400">
      載入地圖
    </div>
  );
}

const AiPlanMiniMapClient = dynamic(
  () => import('./AiPlanMiniMapClient').then(mod => mod.AiPlanMiniMapClient),
  { ssr: false, loading: () => <MiniMapLoading /> },
);

export function AiPlanMiniMap({ locations }: Props) {
  if (locations.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[11px] font-medium text-slate-400">
        無座標
      </div>
    );
  }

  return <AiPlanMiniMapClient locations={locations} />;
}

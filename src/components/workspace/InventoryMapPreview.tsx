'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { InventoryLocation } from '@/types/inventory';

interface InventoryMapPreviewProps {
  inventory: InventoryLocation[];
  onStartPlanning: () => void;
}

function getPinColor(availability: number): string {
  if (availability >= 0.7) return '#6366f1';
  if (availability >= 0.3) return '#f59e0b';
  return '#94a3b8';
}

export function InventoryMapPreview({ inventory, onStartPlanning }: InventoryMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [24.98, 121.38],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      setTimeout(() => map.invalidateSize(), 100);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      inventory.forEach((item) => {
        const color = getPinColor(item.availability);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        L.marker([item.latitude, item.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px;font-family:system-ui,sans-serif">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${item.name}</div>
              <div style="font-size:12px;color:#64748b">${item.district} · ${item.screenType}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px">NT$${item.pricePerDay.toLocaleString()} / 天</div>
            </div>
          `);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [inventory]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 360 }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />可用</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />有限</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />不可用</span>
      </div>

      {/* CTA */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onStartPlanning}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-colors"
        >
          + 開始規劃
        </button>
      </div>

      {/* Count badge */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm border border-slate-100 text-xs text-slate-600 font-medium">
        {inventory.length} 個版位
      </div>
    </div>
  );
}

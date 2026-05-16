'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import type { InventoryLocation } from '@/types/inventory';

interface InventoryExplorerProps {
  inventory: InventoryLocation[];
  usedInventoryIds: Set<string>;
}

type CityFilter = '全部' | '台北' | '新北' | '桃園';
type TypeFilter = '全部' | '捷運站' | '看板' | '商場' | '機場';

const CITY_MAP: Record<string, string[]> = {
  '台北': ['台北市', 'Taipei'],
  '新北': ['新北市', 'New Taipei'],
  '桃園': ['桃園市', 'Taoyuan'],
};

function matchesTypeFilter(item: InventoryLocation, f: TypeFilter): boolean {
  if (f === '全部') return true;
  if (f === '捷運站') return item.venueType === 'Station' || item.venueType === 'Subway';
  if (f === '看板') return item.screenType === 'Billboard' || item.venueType === 'Highway' || item.venueType === 'Street';
  if (f === '商場') return item.venueType === 'Mall';
  if (f === '機場') return item.venueType === 'Airport';
  return true;
}

function getPinStyle(item: InventoryLocation, usedIds: Set<string>) {
  if (usedIds.has(item.id)) return { color: '#10b981', size: 16, star: true };
  if (item.availability >= 0.7) return { color: '#6366f1', size: 12, star: false };
  if (item.availability >= 0.3) return { color: '#f59e0b', size: 12, star: false };
  return { color: '#94a3b8', size: 12, star: false };
}

function getAvailStyle(availability: number): { color: string; label: string } {
  if (availability >= 0.7) return { color: '#6366f1', label: '可用' };
  if (availability >= 0.3) return { color: '#f59e0b', label: '有限' };
  return { color: '#94a3b8', label: '不可用' };
}

function buildPopupHtml(item: InventoryLocation, isUsed: boolean): string {
  const { color, label } = getAvailStyle(item.availability);
  const pct = Math.round(item.availability * 100);
  const tags = item.audienceTags.slice(0, 3).join(' · ');
  const usedBadge = isUsed
    ? `<div style="margin-top:6px;display:inline-block;background:#d1fae5;color:#065f46;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px">★ 已使用於過去活動</div>`
    : '';
  return `
    <div style="min-width:210px;font-family:system-ui,sans-serif;line-height:1.4">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px">${item.name}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px">${item.district} · ${item.screenType}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
        <span style="font-size:11px;color:#475569">${label} ${pct}%</span>
      </div>
      <div style="background:#f1f5f9;border-radius:4px;height:4px;margin-bottom:8px">
        <div style="background:${color};width:${pct}%;height:100%;border-radius:4px"></div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:8px">
        <div style="font-size:11px;color:#0f172a;font-weight:600">NT$${item.pricePerDay.toLocaleString()}<span style="font-weight:400;color:#64748b">/天</span></div>
        <div style="font-size:11px;color:#64748b">${(item.dailyImpressions / 1000).toFixed(0)}K 曝光</div>
      </div>
      ${tags ? `<div style="font-size:10px;color:#6366f1;margin-bottom:8px">${tags}</div>` : ''}
      ${usedBadge}
      <a href="/campaign-planner?inventoryId=${item.id}" style="display:block;margin-top:8px;text-align:center;background:#4f46e5;color:white;padding:7px 12px;border-radius:10px;font-size:12px;font-weight:600;text-decoration:none">開始規劃 →</a>
    </div>
  `;
}

export function InventoryExplorer({ inventory, usedInventoryIds }: InventoryExplorerProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerLayerRef = useRef<unknown>(null);

  const [cityFilter, setCityFilter] = useState<CityFilter>('全部');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('全部');

  const displayed = useMemo(() => {
    return inventory.filter(item => {
      if (cityFilter !== '全部') {
        const allowed = CITY_MAP[cityFilter] ?? [];
        if (!allowed.includes(item.city)) return false;
      }
      if (!matchesTypeFilter(item, typeFilter)) return false;
      return true;
    });
  }, [inventory, cityFilter, typeFilter]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      if (!mapRef.current || mapInstanceRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(mapRef.current!, {
        center: [24.98, 121.38],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    });
    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
      }
    };
  }, []);

  // Re-render markers whenever displayed list or usedInventoryIds changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current) return;
    import('leaflet').then(L => {
      if (!markerLayerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (markerLayerRef.current as any).clearLayers();
      displayed.forEach(item => {
        const { color, size, star } = getPinStyle(item, usedInventoryIds);
        const half = size / 2;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${size * 0.55}px;color:white;line-height:1">${star ? '★' : ''}</div>`,
          iconSize: [size, size],
          iconAnchor: [half, half],
        });
        const isUsed = usedInventoryIds.has(item.id);
        const marker = L.marker([item.latitude, item.longitude], { icon });
        marker.bindPopup(buildPopupHtml(item, isUsed), {
          maxWidth: 260,
          className: 'dooh-popup',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (markerLayerRef.current as any).addLayer(marker);
      });
    });
  }, [displayed, usedInventoryIds]);

  // Handle "開始規劃" clicks inside Leaflet popup (not React-rendered)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/campaign-planner"]');
      if (link) {
        e.preventDefault();
        router.push((link as HTMLAnchorElement).href.replace(window.location.origin, ''));
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [router]);

  const cityTabs: CityFilter[] = ['全部', '台北', '新北', '桃園'];
  const typeFilters: TypeFilter[] = ['全部', '捷運站', '看板', '商場', '機場'];

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {cityTabs.map(c => (
            <button
              key={c}
              onClick={() => setCityFilter(c)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                cityFilter === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeFilters.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 500 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-3 text-xs text-slate-600 z-[500]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />可用</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />有限</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />不可用</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />已使用</span>
        </div>

        {/* Count badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm border border-slate-100 text-xs text-slate-600 font-medium z-[500]">
          {cityFilter === '全部' ? '' : cityFilter + ' '}{displayed.length} 個版位
        </div>

        {/* CTA */}
        <div className="absolute top-4 right-4 z-[500]">
          <button
            onClick={() => router.push('/campaign-planner')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-colors"
          >
            + 開始規劃
          </button>
        </div>
      </div>
    </div>
  );
}

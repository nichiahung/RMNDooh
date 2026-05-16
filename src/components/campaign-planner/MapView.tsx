'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InventoryLocation, MediaPlanItem } from '@/types/inventory';
import { isInMediaPlan } from '@/utils/mediaPlanCalculations';
import { useI18n } from '@/i18n/I18nProvider';
import { MapPopupCard, MapPopupCardProps } from './MapPopupCard';

interface Props {
  inventory: InventoryLocation[];
  selectedItems: MediaPlanItem[];
  onViewDetails: (item: InventoryLocation) => void;
  onAdd: (item: InventoryLocation) => void;
}

const createIcon = (color: string, isSelected: boolean) => {
  const w = 40;
  const h = 52;
  const pulse = isSelected
    ? `<div style="position:absolute;top:-6px;left:-6px;width:${w + 12}px;height:${w + 12}px;border-radius:50%;background:${color};opacity:0.3;animation:lp 1.5s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
    html: `
      <div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.4));cursor:pointer;">
        ${pulse}
        <svg viewBox="0 0 40 52" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="20" r="9" fill="white" opacity="0.95"/>
        </svg>
      </div>
      <style>@keyframes lp{75%,100%{transform:scale(2.2);opacity:0}}</style>
    `
  });
};

function FitBounds({ inventory }: { inventory: InventoryLocation[] }) {
  const map = useMap();
  const fitted = React.useRef(false);

  React.useEffect(() => {
    if (inventory.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(inventory.map(i => [i.latitude, i.longitude]));
    map.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
    fitted.current = true;
  }, [inventory, map]);

  return null;
}

interface CloseablePopupCardProps extends Omit<MapPopupCardProps, 'onClose'> {
  onViewDetail: () => void;
}

function CloseablePopupCard({ onViewDetail, ...rest }: CloseablePopupCardProps) {
  const map = useMap();
  const close = () => map.closePopup();
  return (
    <MapPopupCard
      {...rest}
      onClose={close}
      onViewDetail={() => { close(); onViewDetail(); }}
    />
  );
}

export function MapView({ inventory, selectedItems, onViewDetails, onAdd }: Props) {
  const { t } = useI18n();
  const center: [number, number] = [25.042, 121.565];

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20 px-4 bg-slate-100">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">No locations available on the map</p>
          <p className="text-sm text-slate-500">
            Try adjusting your filters to see more inventory on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#f1f5f9' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds inventory={inventory} />

        {inventory.map(item => {
          const isSelected = isInMediaPlan(selectedItems, item.id);
          let color = '#6366f1';
          if (isSelected) color = '#10b981';
          else if (item.availability < 0.3) color = '#94a3b8';
          else if (item.availability < 0.7) color = '#f59e0b';

          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={createIcon(color, isSelected)}
            >
              <Popup
                closeButton={false}
                className="map-popup-clean"
                minWidth={240}
                maxWidth={240}
              >
                <CloseablePopupCard
                  item={item}
                  isSelected={isSelected}
                  onAdd={() => onAdd(item)}
                  onViewDetail={() => onViewDetails(item)}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 z-[1000]">
        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Availability</h4>
        <div className="space-y-2">
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-200 mr-2"></span> {t('map.available')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-200 mr-2"></span> {t('map.limited')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-200 mr-2"></span> {t('map.unavailable')}
          </div>
          <div className="flex items-center text-xs text-slate-700 font-medium pt-1 border-t border-slate-100">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 mr-2"></span> {t('map.selectedInPlan')}
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-slate-200 font-semibold text-slate-800 text-sm z-[1000]">
        {t('planner.showing')} {inventory.length} {t('planner.locations')}
      </div>
    </div>
  );
}

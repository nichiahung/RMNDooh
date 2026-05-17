'use client';

import React from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { InventoryLocation } from '@/types/inventory';

interface Props {
  locations: InventoryLocation[];
}

const fallbackCenter: [number, number] = [25.042, 121.565];

const markerIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `
    <div style="
      width:18px;
      height:18px;
      border-radius:999px;
      background:#4f46e5;
      border:3px solid white;
      box-shadow:0 4px 10px rgba(15,23,42,0.28);
    "></div>
  `,
});

function FitMiniBounds({ locations }: Props) {
  const map = useMap();
  const locationKey = React.useMemo(
    () => locations.map(location => `${location.id}:${location.latitude},${location.longitude}`).sort().join('|'),
    [locations],
  );

  React.useEffect(() => {
    map.invalidateSize();

    if (locations.length === 0) {
      map.setView(fallbackCenter, 11, { animate: false });
      return;
    }

    if (locations.length === 1) {
      const [location] = locations;
      map.setView([location.latitude, location.longitude], 14, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(locations.map(location => [location.latitude, location.longitude]));
    map.fitBounds(bounds.pad(0.3), { maxZoom: 14, animate: false });
  }, [locations, locationKey, map]);

  return null;
}

export function AiPlanMiniMapClient({ locations }: Props) {
  return (
    <MapContainer
      center={fallbackCenter}
      zoom={11}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      className="h-full w-full z-0"
      style={{ background: '#e2e8f0' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMiniBounds locations={locations} />
      {locations.map(location => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={markerIcon}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}

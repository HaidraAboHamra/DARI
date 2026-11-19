'use client';

import { type MapPoint, VERTICAL_META } from '@dari/contracts';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/** Directory map (blueprint "دليل المدينة"). OpenStreetMap tiles for the pilot; swap to a self-hosted tile server at scale. */
export function CityMap({ points, center }: { points: MapPoint[]; center: [number, number] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | null = null;
    void import('leaflet').then((L) => {
      if (disposed || !container.current) return;
      map = L.map(container.current, { zoomControl: true }).setView(center, 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      for (const p of points) {
        const color = VERTICAL_META[p.vertical].color;
        const marker = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(map);
        const link = document.createElement('a');
        link.href = `/b/${p.slug}`;
        link.textContent = `${p.name} — ${VERTICAL_META[p.vertical].labelAr}`;
        link.style.fontWeight = '600';
        marker.bindPopup(link);
      }
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points, center]);

  return <div ref={container} className="h-[70dvh] w-full overflow-hidden rounded-[var(--radius-card)] border border-sand" role="region" aria-label="خريطة أنشطة المدينة" />;
}

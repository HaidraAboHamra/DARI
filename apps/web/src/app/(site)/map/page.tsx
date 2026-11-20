import type { MapLayers } from '@dari/contracts';
import type { Metadata } from 'next';
import { CityMap3D } from '@/components/map/city-map-3d';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'خريطة المدينة' };
export const dynamic = 'force-dynamic';

/** The live 3D city map: businesses, events, property and news — the same map as the app's «استكشف». */
export default async function MapPage() {
  const layers = await api<MapLayers>('/map/layers', { query: { city: config.city } });
  return (
    <>
      <PageHeader title="سلمية على الخريطة" subtitle="كل ما في المدينة، مباشر وثلاثي الأبعاد" />
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand">
        <CityMap3D initial={layers} liveUrl="/api/map-layers" height="72dvh" />
      </div>
    </>
  );
}

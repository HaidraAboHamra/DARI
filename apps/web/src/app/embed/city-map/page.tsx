import type { MapLayers } from '@dari/contracts';
import type { Metadata } from 'next';
import { CityMap3D } from '@/components/map/city-map-3d';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'خريطة سلمية', robots: { index: false } };
export const dynamic = 'force-dynamic';

const num = (v: string | undefined) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : undefined);

/**
 * Full-screen map for the mobile app (WebView): `?mode=explore|pick&lat=&lng=`.
 * Taps post `{source:'dari-map', type:'open'|'picked'}` messages to the host app.
 */
export default async function EmbeddedCityMap({ searchParams }: { searchParams: Promise<{ mode?: string; lat?: string; lng?: string }> }) {
  const sp = await searchParams;
  const layers = await api<MapLayers>('/map/layers', { query: { city: config.city } });
  const lat = num(sp.lat);
  const lng = num(sp.lng);
  return (
    <main className="fixed inset-0">
      <CityMap3D initial={layers} mode={sp.mode === 'pick' ? 'pick' : 'explore'} user={lat !== undefined && lng !== undefined ? { lat, lng } : null} liveUrl="/api/map-layers" />
    </main>
  );
}

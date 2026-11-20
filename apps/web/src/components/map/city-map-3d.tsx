'use client';

import { type GeoPoint, type MapLayers, VERTICAL_META, type Vertical } from '@dari/contracts';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { eventWhen, money, timeAgo } from '@/lib/format';
import { dariMapStyle } from './map-style';

type Kind = 'food' | 'shopping' | 'services' | 'health' | 'more' | 'events' | 'property' | 'news';
interface Pin {
  key: string;
  kind: Kind;
  lat: number;
  lng: number;
  color: string;
  glyph: string;
  title: string;
  subtitle: string;
  href: string;
  /** Pulsing ring: an event happening now, or news from the last 24 hours. */
  live: boolean;
  dim: boolean;
}

const FILTERS: { id: Kind | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'food', label: 'طعام' },
  { id: 'shopping', label: 'تسوق' },
  { id: 'services', label: 'خدمات' },
  { id: 'health', label: 'صحة' },
  { id: 'events', label: 'فعاليات' },
  { id: 'property', label: 'عقارات' },
  { id: 'news', label: 'أخبار' },
];

/** 24×24 line glyphs drawn inside the pins. */
const GLYPHS: Record<string, string> = {
  food: 'M8 3v7M6 3v4a2 2 0 0 0 4 0V3M8 10v11M17 21V3c-2 1.5-3 4-3 7v3h3',
  shopping: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0',
  services: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.5-.5-.5-2.5z',
  health: 'M12 5v14M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  events: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z',
  property: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  news: 'M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-2 0M8 9h5M8 12h5M8 15h3',
};
const KIND_OF: Partial<Record<Vertical, Kind>> = { food: 'food', shopping: 'shopping', services: 'services', health: 'health' };

function pinsOf(layers: MapLayers): Pin[] {
  return [
    ...layers.businesses.map<Pin>((b) => {
      const kind = KIND_OF[b.vertical] ?? 'more';
      return {
        key: `b:${b.id}`,
        kind,
        lat: b.lat,
        lng: b.lng,
        color: VERTICAL_META[b.vertical].color,
        glyph: GLYPHS[kind === 'more' ? 'more' : kind]!,
        title: b.name,
        subtitle: [b.categoryName, b.isOpen ? 'مفتوح الآن' : 'مغلق الآن', b.ratingAvg ? `★ ${b.ratingAvg}` : null].filter(Boolean).join(' · '),
        href: `/b/${encodeURIComponent(b.slug)}`,
        live: false,
        dim: !b.isOpen,
      };
    }),
    ...layers.events.map<Pin>((e) => ({
      key: `e:${e.id}`,
      kind: 'events',
      lat: e.lat,
      lng: e.lng,
      color: VERTICAL_META[e.kind === 'trip' ? 'trips' : 'events'].color,
      glyph: GLYPHS.events!,
      title: e.title,
      subtitle: `${e.live ? 'يجري الآن · ' : ''}${eventWhen(e.startsAt)} · ${e.price ? money(e.price) : 'مجاني'}`,
      href: `/events/${e.id}`,
      live: e.live,
      dim: false,
    })),
    ...layers.listings.map<Pin>((l) => ({
      key: `l:${l.id}`,
      kind: 'property',
      lat: l.lat,
      lng: l.lng,
      color: VERTICAL_META.property.color,
      glyph: GLYPHS.property!,
      title: l.title,
      subtitle: `${l.purpose === 'rent' ? 'للإيجار' : 'للبيع'} · ${money(l.price)}`,
      href: `/property/${l.id}`,
      live: false,
      dim: false,
    })),
    ...layers.news.map<Pin>((n) => ({
      key: `n:${n.slug}`,
      kind: 'news',
      lat: n.lat,
      lng: n.lng,
      color: VERTICAL_META.news.color,
      glyph: GLYPHS.news!,
      title: n.title,
      subtitle: `${n.category ?? 'أخبار'} · ${timeAgo(n.publishedAt)}`,
      href: `/news/${encodeURIComponent(n.slug)}`,
      live: n.fresh,
      dim: false,
    })),
  ];
}

function pinElement(pin: Pin, onSelect: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `dari-pin${pin.live ? ' is-live' : ''}${pin.dim ? ' is-dim' : ''}`;
  el.setAttribute('aria-label', pin.title);
  el.style.setProperty('--pin', pin.color);
  el.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pin.glyph}"/></svg>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect();
  });
  return el;
}

/** Messages to the host app when embedded (React Native WebView or an iframe). */
function post(message: Record<string, unknown>): boolean {
  const payload = JSON.stringify({ source: 'dari-map', ...message });
  const rn = (window as unknown as { ReactNativeWebView?: { postMessage(m: string): void } }).ReactNativeWebView;
  if (rn) return rn.postMessage(payload), true;
  if (window.parent !== window) return window.parent.postMessage(payload, '*'), true;
  return false;
}

interface Props {
  initial: MapLayers;
  /** `explore`: the live city map. `pick`: choose a precise delivery point. */
  mode?: 'explore' | 'pick';
  user?: GeoPoint | null;
  /** Polled for live updates (same-origin route). */
  liveUrl?: string;
  height?: string;
}

/** Live 3D city map (MapLibre): businesses, events, property and news, refreshed every 30 s. */
export function CityMap3D({ initial, mode = 'explore', user, liveUrl, height = '100dvh' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [layers, setLayers] = useState(initial);
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const [selected, setSelected] = useState<Pin | null>(null);
  const [ready, setReady] = useState(false);
  const [is3d, setIs3d] = useState(true);
  const pins = useMemo(() => pinsOf(layers), [layers]);
  const counts = useMemo(() => ({ live: pins.filter((p) => p.live).length }), [pins]);

  const open = useCallback((href: string) => {
    if (!post({ type: 'open', href })) window.location.href = href;
  }, []);

  // Create the map once.
  useEffect(() => {
    let disposed = false;
    void import('maplibre-gl').then((ml) => {
      if (disposed || !box.current) return;
      if (ml.getRTLTextPluginStatus() === 'unavailable') void ml.setRTLTextPlugin('/vendor/mapbox-gl-rtl-text.js', true);
      const center = user ?? layers.center;
      const m = new ml.Map({
        container: box.current,
        style: dariMapStyle(),
        center: [center.lng, center.lat],
        zoom: 13.4,
        pitch: 0,
        bearing: 0,
        maxPitch: 70,
        attributionControl: { compact: true },
      });
      map.current = m;
      m.on('load', () => {
        setReady(true);
        // Arrive in 3D: tilt and rotate gently into the city.
        m.easeTo({ zoom: mode === 'pick' ? 17 : 15.4, pitch: mode === 'pick' ? 30 : 58, bearing: mode === 'pick' ? 0 : -18, duration: 1800 });
        post({ type: 'ready' });
      });
      if (user) {
        const dot = document.createElement('div');
        dot.className = 'dari-me';
        dot.setAttribute('aria-label', 'موقعك');
        new ml.Marker({ element: dot }).setLngLat([user.lng, user.lat]).addTo(m);
      }
      m.on('click', () => setSelected(null));
      // Keep the canvas matched to its box (WebView/iframe and layout resizes).
      resize = new ResizeObserver(() => m.resize());
      resize.observe(box.current);
    });
    let resize: ResizeObserver | null = null;
    return () => {
      disposed = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // The map is created once; data updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)draw markers for the current data and filter.
  useEffect(() => {
    if (!ready || mode === 'pick') return;
    let cancelled = false;
    void import('maplibre-gl').then((ml) => {
      if (cancelled || !map.current) return;
      markers.current.forEach((mk) => mk.remove());
      markers.current = pins
        .filter((p) => filter === 'all' || p.kind === filter)
        .map((p) => new ml.Marker({ element: pinElement(p, () => setSelected(p)) }).setLngLat([p.lng, p.lat]).addTo(map.current!));
    });
    return () => {
      cancelled = true;
    };
  }, [pins, filter, ready, mode]);

  // Live: refresh every 30 s.
  useEffect(() => {
    if (!liveUrl || mode === 'pick') return;
    const t = setInterval(() => {
      void fetch(liveUrl, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<MapLayers>) : null))
        .then((next) => next && setLayers(next))
        .catch(() => undefined);
    }, 30_000);
    return () => clearInterval(t);
  }, [liveUrl, mode]);

  const toggle3d = () => {
    const next = !is3d;
    setIs3d(next);
    map.current?.easeTo({ pitch: next ? 58 : 0, bearing: next ? -18 : 0, duration: 700 });
  };
  const recenter = () => {
    const c = user ?? layers.center;
    map.current?.easeTo({ center: [c.lng, c.lat], zoom: mode === 'pick' ? 17 : 15.4, duration: 800 });
  };
  const confirmPick = () => {
    const c = map.current?.getCenter();
    if (c) post({ type: 'picked', lat: Math.round(c.lat * 1e6) / 1e6, lng: Math.round(c.lng * 1e6) / 1e6 });
  };

  return (
    <div className="relative w-full overflow-hidden bg-ivory" style={{ height }}>
      <style>{`
        .dari-pin{width:36px;height:36px;border-radius:50%;background:var(--pin);border:3px solid #fff;box-shadow:0 4px 12px rgba(11,20,36,.28);display:grid;place-items:center;cursor:pointer;position:relative;padding:0}
        .dari-pin.is-dim{filter:saturate(.35);opacity:.7}
        .dari-pin.is-live::after{content:'';position:absolute;inset:-9px;border-radius:50%;border:3px solid var(--pin);animation:dari-pulse 1.8s ease-out infinite}
        @keyframes dari-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.5);opacity:0}}
        .dari-me{width:18px;height:18px;border-radius:50%;background:#2F6BFF;border:3px solid #fff;box-shadow:0 0 0 8px rgba(47,107,255,.2)}
        @media (prefers-reduced-motion:reduce){.dari-pin.is-live::after{animation:none;opacity:.6}}
      `}</style>
      {/* Inline position: maplibre-gl.css sets `.maplibregl-map { position: relative }`, which would collapse a class-based inset. */}
      <div ref={box} style={{ position: 'absolute', inset: 0 }} role="region" aria-label="خريطة سلمية التفاعلية" />

      {mode === 'explore' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-2 self-start rounded-full bg-navy/90 px-4 py-2 text-sm text-champagne shadow-lg backdrop-blur">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" /></span>
            <span className="font-bold">سلمية مباشر</span>
            <span className="opacity-80">· {pins.length} على الخريطة{counts.live ? ` · ${counts.live} الآن` : ''}</span>
          </div>
          <div className="no-scrollbar pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold shadow-md ${filter === f.id ? 'bg-navy text-champagne' : 'bg-white/95 text-navy'}`}
                aria-pressed={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute end-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button type="button" onClick={toggle3d} className="grid h-11 w-11 place-items-center rounded-full bg-white font-bold text-navy shadow-lg" aria-label={is3d ? 'عرض ثنائي الأبعاد' : 'عرض ثلاثي الأبعاد'}>
          {is3d ? '2D' : '3D'}
        </button>
        <button type="button" onClick={recenter} className="grid h-11 w-11 place-items-center rounded-full bg-white text-navy shadow-lg" aria-label={user ? 'موقعي' : 'مركز المدينة'}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
      </div>

      {mode === 'pick' && (
        <>
          {/* Fixed centre pin: the map moves under it. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" aria-hidden>
            <svg width="44" height="54" viewBox="0 0 44 54"><path d="M22 52s18-16.5 18-30a18 18 0 0 0-36 0c0 13.5 18 30 18 30z" fill="#0B1424" /><circle cx="22" cy="22" r="8" fill="#C9A24B" /></svg>
          </div>
          <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-xl">
            <p className="text-center font-semibold text-navy">حرّك الخريطة حتى يصير الدبوس فوق باب بيتك تماماً</p>
            <button type="button" onClick={confirmPick} className="min-h-13 rounded-full bg-gold text-lg font-bold text-navy">تأكيد الموقع</button>
          </div>
        </>
      )}

      {selected && mode === 'explore' && (
        <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-3 rounded-3xl bg-white p-4 shadow-xl" role="dialog" aria-label={selected.title}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: selected.color }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={selected.glyph} /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-navy">{selected.title}</p>
            <p className="truncate text-sm text-muted">{selected.subtitle}</p>
          </div>
          <button type="button" onClick={() => open(selected.href)} className="min-h-11 shrink-0 rounded-full bg-gold px-5 font-bold text-navy">فتح</button>
        </div>
      )}
    </div>
  );
}

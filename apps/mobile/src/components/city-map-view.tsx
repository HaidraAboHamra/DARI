import type { GeoPoint } from '@dari/contracts';
import { createElement, useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { colors } from '@/theme';

type MapMessage = { source: 'dari-map'; type: 'open'; href: string } | { source: 'dari-map'; type: 'picked'; lat: number; lng: number } | { source: 'dari-map'; type: 'ready' };

/** The website hosting the shared 3D map: same host as the API in test builds, else the configured site. */
export function webBase(): string {
  return config.serverSwitch ? api.serverUrl.replace(/\/api\/v\d+$/, '') : config.webUrl;
}

function parse(raw: unknown): MapMessage | null {
  try {
    const m = typeof raw === 'string' ? (JSON.parse(raw) as MapMessage) : null;
    return m?.source === 'dari-map' ? m : null;
  } catch {
    return null;
  }
}

/**
 * The live 3D city map (MapLibre, served by the Dari website) inside the app.
 * Native: WebView; web preview: iframe. Taps come back as messages.
 */
export function CityMapView({ mode, point, onOpen, onPicked }: { mode: 'explore' | 'pick'; point: GeoPoint | null; onOpen?: (href: string) => void; onPicked?: (p: GeoPoint) => void }) {
  const params = new URLSearchParams({ mode, ...(point && { lat: String(point.lat), lng: String(point.lng) }) });
  const uri = `${webBase()}/embed/city-map?${params}`;
  const handle = (m: MapMessage | null) => {
    if (m?.type === 'open') onOpen?.(m.href);
    if (m?.type === 'picked') onPicked?.({ lat: m.lat, lng: m.lng });
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (e: MessageEvent) => handle(parse(e.data));
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  });

  if (Platform.OS === 'web') {
    return createElement('iframe', { src: uri, title: 'خريطة سلمية', style: { border: 0, width: '100%', height: '100%' }, allow: 'geolocation' });
  }
  return (
    <WebView
      source={{ uri }}
      onMessage={(e: WebViewMessageEvent) => handle(parse(e.nativeEvent.data))}
      startInLoadingState
      renderLoading={() => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory }}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      )}
      // The map needs WebGL and touch gestures; keep the page from bouncing.
      javaScriptEnabled
      domStorageEnabled
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: colors.ivory }}
    />
  );
}

import type { GeoPoint } from '@dari/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'dari.location.v1';

export interface SavedLocation {
  point: GeoPoint;
  /** Street / neighbourhood name for the «التوصيل إلى» header. */
  label: string;
  source: 'gps' | 'map';
}

interface LocationApi {
  location: SavedLocation | null;
  /** True while asking the GPS. */
  locating: boolean;
  denied: boolean;
  /** Reads the precise GPS position (asks permission once). */
  locate(): Promise<SavedLocation | null>;
  /** A point the user placed on the map. */
  setPoint(point: GeoPoint): Promise<SavedLocation>;
}

const Ctx = createContext<LocationApi | null>(null);

async function labelFor(point: GeoPoint): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
    const name = place?.street ?? place?.district ?? place?.subregion ?? place?.name;
    if (name) return name;
  } catch {
    /* no geocoder (web/offline): fall back below */
  }
  return 'موقعك المحدد';
}

/** The customer's precise location, shared by delivery pricing and the city map. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const save = useCallback((next: SavedLocation) => {
    setLocation(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
    return next;
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return null;
      }
      setDenied(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      return save({ point, label: await labelFor(point), source: 'gps' });
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  }, [save]);

  const setPoint = useCallback(async (point: GeoPoint) => save({ point, label: await labelFor(point), source: 'map' }), [save]);

  // Restore the last location; refresh from GPS silently if permission was already given
  // (a point the user placed by hand on the map is kept).
  useEffect(() => {
    void (async () => {
      let saved: SavedLocation | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        saved = raw ? (JSON.parse(raw) as SavedLocation) : null;
      } catch {
        /* storage unavailable */
      }
      if (saved) setLocation(saved);
      const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (permission?.granted && saved?.source !== 'map') await locate();
    })();
  }, [locate]);

  const value = useMemo(() => ({ location, locating, denied, locate, setPoint }), [location, locating, denied, locate, setPoint]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation(): LocationApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>');
  return ctx;
}

/** `{ lat, lng }` query params when a location is known (for per-distance fees). */
export function pointQuery(location: SavedLocation | null): { lat?: number; lng?: number } {
  return location ? { lat: location.point.lat, lng: location.point.lng } : {};
}

import type { StyleSpecification } from 'maplibre-gl';

/**
 * Dari base map: OpenFreeMap vector tiles (OpenStreetMap data, no API key) in the brand's
 * calm palette — ivory ground, sand roads, softly lit 3D buildings, navy Arabic labels.
 * Swap `TILES` for a self-hosted tile server at scale.
 */
const TILES = 'https://tiles.openfreemap.org/planet';
const label = ['coalesce', ['get', 'name:ar'], ['get', 'name']];

export function dariMapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { omt: { type: 'vector', url: TILES, attribution: '© OpenStreetMap · OpenFreeMap' } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#F3ECDC' } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', paint: { 'fill-color': '#E3E6CC', 'fill-opacity': 0.6 } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#D6E2C0', 'fill-opacity': 0.7 } },
      {
        id: 'landuse',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['residential', 'commercial', 'retail'], true, false],
        paint: { 'fill-color': '#EFE6D2', 'fill-opacity': 0.8 },
      },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#BFD3E0' } },
      {
        id: 'road-casing',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#DCCFB2', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 1.5, 16, 14, 18, 30] },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.6, 16, 6, 18, 14] },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FFFDF7', 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 1, 16, 11, 18, 24] },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13.5,
        paint: {
          // Low houses stay ivory; taller blocks warm towards sand-gold.
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#EDE3CC', 12, '#E2D2AC', 30, '#D2BB86'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 15, ['coalesce', ['get', 'render_height'], 6]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.88,
        },
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 15,
        layout: { 'symbol-placement': 'line', 'text-field': label, 'text-font': ['Noto Sans Regular'], 'text-size': 12 },
        paint: { 'text-color': '#6B5F45', 'text-halo-color': '#FFFDF7', 'text-halo-width': 1.5 },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'suburb', 'neighbourhood', 'quarter'], true, false],
        layout: {
          'text-field': label,
          'text-font': ['Noto Sans Bold'],
          'text-size': ['match', ['get', 'class'], ['city', 'town'], 17, 13],
        },
        paint: { 'text-color': '#0B1424', 'text-halo-color': '#F6F0E0', 'text-halo-width': 2 },
      },
    ],
  } as StyleSpecification;
}

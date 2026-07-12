import { assetUrl } from './assetUrl.js';

// Read a CSS custom property (theme variable) at runtime.
export function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Minimal MapLibre style: globe projection, themed ocean background, bundled glyphs.
// All data layers are added as react-map-gl <Source>/<Layer> children.
export function baseMapStyle() {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: assetUrl('glyphs/') + '{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': cssVar('--map-ocean', '#cfe8f3') } },
    ],
  };
}

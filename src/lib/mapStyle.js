import { assetUrl } from './assetUrl.js';

// Theme-keyed map colors. Derived from the app theme value directly (NOT from
// getComputedStyle) because React effects apply the `dark` class on <html> after
// children render — reading the DOM here would always be one theme-step behind.
export const OCEAN_COLORS = { light: '#cfe8f3', dark: '#0b1f2a' };
export const BORDER_COLORS = { light: '#7a8288', dark: '#5b6b5e' };
export const LABEL_COLORS = {
  light: { text: '#1f2933', halo: 'rgba(255,255,255,0.85)' },
  dark: { text: '#e5e7eb', halo: 'rgba(0,0,0,0.7)' },
};

// Minimal MapLibre style: globe projection, themed ocean background, bundled glyphs.
// All data layers are added as react-map-gl <Source>/<Layer> children.
export function baseMapStyle(theme) {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: assetUrl('glyphs/') + '{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': OCEAN_COLORS[theme] ?? OCEAN_COLORS.light } },
    ],
  };
}

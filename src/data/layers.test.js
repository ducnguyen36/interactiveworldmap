import { describe, it, expect } from 'vitest';
import { LAYERS, baseLayers, overlayLayers } from './layers.js';

describe('layer registry', () => {
  it('every layer has id, labelKey, kind and a component', () => {
    for (const l of LAYERS) {
      expect(l.id).toBeTruthy();
      expect(l.labelKey).toMatch(/^layer\./);
      expect(['base', 'overlay']).toContain(l.kind);
      expect(typeof l.component).toBe('function');
    }
  });
  it('exposes exactly one default-enabled base layer (political)', () => {
    const defaults = baseLayers().filter((l) => l.enabledByDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('political');
  });
  it('has no disabled layers (all five are implemented)', () => {
    expect(LAYERS.some((l) => l.disabled)).toBe(false);
    expect(LAYERS.map((l) => l.id).sort()).toEqual(
      ['agriculture', 'climate', 'currents', 'political', 'tectonic']
    );
  });
  it('every overlay has a legend descriptor with items', () => {
    for (const l of overlayLayers()) {
      expect(Array.isArray(l.legend?.items)).toBe(true);
      expect(l.legend.items.length).toBeGreaterThan(0);
      for (const item of l.legend.items) {
        expect(item.icon || item.swatch).toBeTruthy();
        expect(item.labelKey || item.label).toBeTruthy();
      }
    }
  });
  it('political exposes hit-test config and maps a feature to a country selection', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    expect(byId.political.interactiveLayerIds).toEqual(['political-fill']);
    const feature = {
      id: 0, source: 'countries', layer: { id: 'political-fill' },
      properties: { NAME_VI: 'Việt Nam', NAME_EN: 'Vietnam', WIKIDATAID: 'Q881', ISO_A2: 'VN', POP_EST: 97000000 },
      geometry: { type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] },
    };
    const sel = byId.political.selectFeature(feature);
    expect(sel.kind).toBe('country');
    expect(sel.iso2).toBe('VN');
    expect(sel.nameVi).toBe('Việt Nam');
    expect(sel.bounds).toEqual({ south: 8, west: 102, north: 23, east: 110 });
    expect(sel.focus).toEqual({ bounds: sel.bounds });
  });
  it('climate and currents selectFeature map hit-test features', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    const zone = { id: 3, source: 'climate', layer: { id: 'climate-fill' },
      properties: { CODE: 'Af' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] } };
    const selC = byId.climate.selectFeature(zone);
    expect(selC.kind).toBe('climate');
    expect(selC.code).toBe('Af');
    expect(selC.focus.bounds).toEqual({ south: 0, west: 0, north: 2, east: 2 });

    const cur = { id: 1, source: 'currents', layer: { id: 'currents-line' },
      properties: { name_vi: 'Dòng Gulf Stream', name_en: 'Gulf Stream', type: 'warm' },
      geometry: { type: 'LineString', coordinates: [[-80, 25], [-35, 45]] } };
    const selK = byId.currents.selectFeature(cur);
    expect(selK).toMatchObject({ kind: 'current', nameVi: 'Dòng Gulf Stream', nameEn: 'Gulf Stream', type: 'warm' });
    expect(selK.focus.bounds).toEqual({ south: 25, west: -80, north: 45, east: -35 });
  });
});

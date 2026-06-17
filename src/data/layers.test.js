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
});

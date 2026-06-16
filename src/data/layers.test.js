import { describe, it, expect } from 'vitest';
import { LAYERS, baseLayers, overlayLayers } from './layers.js';

describe('layer registry', () => {
  it('every layer has id, labelKey, kind', () => {
    for (const l of LAYERS) {
      expect(l.id).toBeTruthy();
      expect(l.labelKey).toMatch(/^layer\./);
      expect(['base', 'overlay']).toContain(l.kind);
    }
  });
  it('exposes exactly one default-enabled base layer', () => {
    const defaults = baseLayers().filter((l) => l.enabledByDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('political');
  });
  it('political and tectonic are implemented (not disabled)', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    expect(byId.political.disabled).toBeFalsy();
    expect(byId.tectonic.disabled).toBeFalsy();
    expect(byId.currents.disabled).toBe(true);
  });
});

import { dualText } from './dualText.js';
import { geojsonBounds } from './geojsonBounds.js';

// Point FeatureCollections used by the symbol label layers. Country labels sit at
// the bbox centre of the feature's largest ring — good enough for classroom labels.

function largestRing(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? null;
  if (geometry.type === 'MultiPolygon') {
    let best = null, bestLen = -1;
    for (const poly of geometry.coordinates) {
      const ring = poly[0];
      if (ring && ring.length > bestLen) { bestLen = ring.length; best = ring; }
    }
    return best;
  }
  return null;
}

export function countryLabelPoints(countriesFC, mode) {
  const features = [];
  for (const f of countriesFC.features) {
    const p = f.properties;
    if ((p.LABELRANK ?? 9) > 2) continue;
    const ring = largestRing(f.geometry);
    if (!ring) continue;
    const b = geojsonBounds({ type: 'Polygon', coordinates: [ring] });
    if (!b) continue;
    features.push({
      type: 'Feature',
      properties: { label: dualText(p.NAME_VI, p.NAME_EN, mode) },
      geometry: { type: 'Point', coordinates: [(b.west + b.east) / 2, (b.south + b.north) / 2] },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function oceanLabelPoints(oceans, mode) {
  return {
    type: 'FeatureCollection',
    features: (oceans?.features ?? []).map((o) => ({
      type: 'Feature',
      properties: { label: dualText(o.name_vi, o.name_en, mode) },
      // oceans.json stores [lat, lng]; GeoJSON wants [lng, lat]
      geometry: { type: 'Point', coordinates: [o.coord[1], o.coord[0]] },
    })),
  };
}

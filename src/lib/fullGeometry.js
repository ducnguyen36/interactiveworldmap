import { getCachedGeoData } from '../hooks/useGeoData.js';

// Hit-test features from tiled GeoJSON sources have tile-clipped geometry. With
// `generateId`, a feature's id is its index in the original collection, so the full
// geometry can be looked up in the cached source data. Null when unavailable
// (callers fall back to the clipped geometry).
export function fullGeometry(dataPath, feature) {
  if (feature?.id === undefined || feature.id === null) return null;
  const fc = getCachedGeoData(dataPath);
  return fc?.features?.[feature.id]?.geometry ?? null;
}

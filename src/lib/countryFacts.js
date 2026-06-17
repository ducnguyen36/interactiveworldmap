export function commoditiesForCountry(agData, iso2) {
  if (!agData || !iso2) return [];
  return Object.keys(agData).filter((id) =>
    (agData[id] || []).some((loc) => loc.iso2 === iso2)
  );
}

// Bounding-box count (approximate for antimeridian-crossing countries). Volcano
// points are GeoJSON [lng, lat]; bounds is { south, west, north, east }.
export function volcanoCountInBounds(volData, bounds) {
  if (!volData || !bounds) return 0;
  return volData.features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates;
    return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
  }).length;
}

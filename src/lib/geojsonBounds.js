// Bounding box of any GeoJSON geometry as { south, west, north, east }.
export function geojsonBounds(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      if (coords[0] < west) west = coords[0];
      if (coords[0] > east) east = coords[0];
      if (coords[1] < south) south = coords[1];
      if (coords[1] > north) north = coords[1];
    } else {
      for (const c of coords) visit(c);
    }
  };
  visit(geometry.coordinates);
  if (west === Infinity) return null;
  return { south, west, north, east };
}

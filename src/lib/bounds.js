// Serialize a Leaflet LatLngBounds into a plain object (storable in selection state).
export function boundsToObj(b) {
  return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
}

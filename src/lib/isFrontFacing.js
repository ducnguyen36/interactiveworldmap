// True when a [lng, lat] point is on the visible hemisphere of a globe whose
// camera is centered on [lng, lat] `center` (great-circle distance < 90°).
// Used to hide HTML markers that are "behind" the globe.
export function isFrontFacing(center, point) {
  const toRad = (d) => (d * Math.PI) / 180;
  const clng = toRad(center[0]), clat = toRad(center[1]);
  const plng = toRad(point[0]), plat = toRad(point[1]);
  const cosD = Math.sin(clat) * Math.sin(plat) + Math.cos(clat) * Math.cos(plat) * Math.cos(plng - clng);
  return cosD > 0;
}

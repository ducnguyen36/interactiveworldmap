import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useSelection } from '../context/SelectionContext.jsx';

// Selection-driven camera: fly to the clicked feature; restore the prior view on close.
// focus is { bounds: {south,west,north,east} } or { center: [lng, lat] }.
export default function MapController() {
  const { current: map } = useMap();
  const { selected } = useSelection();
  const savedView = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (selected && selected.focus) {
      if (!savedView.current) {
        const c = map.getCenter();
        savedView.current = { center: [c.lng, c.lat], zoom: map.getZoom() };
      }
      const f = selected.focus;
      if (f.bounds) {
        const b = f.bounds;
        map.fitBounds([[b.west, b.south], [b.east, b.north]], { maxZoom: 5.5, padding: 40, duration: 1200 });
      } else if (f.center) {
        map.flyTo({ center: f.center, zoom: Math.max(map.getZoom(), 5.5), duration: 1200 });
      }
    } else if (!selected && savedView.current) {
      map.flyTo({ center: savedView.current.center, zoom: savedView.current.zoom, duration: 1200 });
      savedView.current = null;
    }
  }, [selected, map]);

  return null;
}

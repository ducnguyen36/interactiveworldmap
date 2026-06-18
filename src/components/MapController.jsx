import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSelection } from '../context/SelectionContext.jsx';

// Selection-driven map zoom: focus the clicked feature; restore the prior view on close.
export default function MapController() {
  const map = useMap();
  const { selected } = useSelection();
  const savedView = useRef(null);

  useEffect(() => {
    if (selected && selected.focus) {
      if (!savedView.current) {
        savedView.current = { center: map.getCenter(), zoom: map.getZoom() };
      }
      const f = selected.focus;
      if (f.bounds) {
        const b = f.bounds;
        map.fitBounds([[b.south, b.west], [b.north, b.east]], { animate: true, maxZoom: 6, padding: [20, 20] });
      } else if (f.center) {
        map.flyTo(f.center, Math.max(map.getZoom(), 6), { animate: true });
      }
    } else if (!selected && savedView.current) {
      map.flyTo(savedView.current.center, savedView.current.zoom, { animate: true });
      savedView.current = null;
    }
  }, [selected, map]);

  return null;
}

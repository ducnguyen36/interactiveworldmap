import { MapContainer } from 'react-leaflet';
import { LAYERS } from '../data/layers.js';

export default function MapView({ activeBaseId, activeOverlayIds }) {
  const active = LAYERS.filter(
    (l) => (l.kind === 'base' && l.id === activeBaseId) ||
           (l.kind === 'overlay' && activeOverlayIds.has(l.id))
  );
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={7}
      worldCopyJump
      className="h-full w-full"
    >
      {active.map((l) => l.component && <l.component key={l.id} />)}
    </MapContainer>
  );
}

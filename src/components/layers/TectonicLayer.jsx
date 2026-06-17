import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useSelection } from '../../context/SelectionContext.jsx';

export default function TectonicLayer() {
  const { data: plates } = useGeoData('/data/plates.geojson');
  const { data: volcanoes } = useGeoData('/data/volcanoes.geojson');
  const { setSelected } = useSelection();

  return (
    <>
      {plates && (
        <GeoJSON data={plates} style={() => ({ className: 'plate-boundary', weight: 1.5 })} />
      )}
      {volcanoes && (
        <GeoJSON
          data={volcanoes}
          pointToLayer={(feature, latlng) =>
            L.circleMarker(latlng, { radius: 3.5, className: 'volcano', fillOpacity: 0.9 })
          }
          onEachFeature={(feature, layer) => {
            const name = feature.properties?.name || null;
            if (name) layer.bindTooltip(name, { sticky: true });
            layer.on('click', () => setSelected({ kind: 'volcano', name }));
          }}
        />
      )}
    </>
  );
}

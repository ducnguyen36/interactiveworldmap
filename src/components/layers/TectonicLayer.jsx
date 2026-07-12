import { Source, Layer } from 'react-map-gl/maplibre';
import { assetUrl } from '../../lib/assetUrl.js';

export default function TectonicLayer() {
  return (
    <>
      <Source id="plates" type="geojson" data={assetUrl('data/plates.geojson')}>
        <Layer id="plates-line" type="line" paint={{ 'line-color': '#d64545', 'line-width': 1.5 }} />
      </Source>
      <Source id="volcanoes" type="geojson" data={assetUrl('data/volcanoes.geojson')} generateId>
        <Layer
          id="volcano-circle"
          type="circle"
          paint={{
            'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 6.5, 4],
            'circle-color': '#b91c1c',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          }}
        />
      </Source>
    </>
  );
}

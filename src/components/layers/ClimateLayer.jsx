import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { climateColorExpression } from '../../lib/mapExpressions.js';
import { assetUrl } from '../../lib/assetUrl.js';

export default function ClimateLayer() {
  const fillColor = useMemo(() => climateColorExpression(), []);
  return (
    <Source id="climate" type="geojson" data={assetUrl('data/climate.geojson')} generateId>
      <Layer
        id="climate-fill"
        type="fill"
        paint={{
          'fill-color': fillColor,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.95,
            ['boolean', ['feature-state', 'hover'], false], 0.9,
            0.8,
          ],
        }}
      />
      <Layer
        id="climate-outline"
        type="line"
        paint={{
          'line-color': '#111111',
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0],
        }}
      />
    </Source>
  );
}

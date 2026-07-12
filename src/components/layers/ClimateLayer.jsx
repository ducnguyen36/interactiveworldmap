import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { climateColorExpression } from '../../lib/mapExpressions.js';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

export default function ClimateLayer() {
  // Single fetch via the app cache — this also primes fullGeometry's lookup so
  // climate clicks zoom to the full zone, not the tile-clipped fragment.
  const { data } = useGeoData('/data/climate.geojson');
  const fillColor = useMemo(() => climateColorExpression(), []);
  return (
    <Source id="climate" type="geojson" data={data ?? EMPTY_FC} generateId>
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

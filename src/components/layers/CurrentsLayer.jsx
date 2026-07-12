import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { currentColorExpression } from '../../lib/mapExpressions.js';
import { assetUrl } from '../../lib/assetUrl.js';
import { bearing } from '../../lib/bearing.js';
import { isFrontFacing } from '../../lib/isFrontFacing.js';

export default function CurrentsLayer({ center = [0, 20] }) {
  const { data } = useGeoData('/data/currents.geojson');
  return (
    <>
      <Source id="currents" type="geojson" data={assetUrl('data/currents.geojson')} generateId>
        <Layer
          id="currents-line"
          type="line"
          layout={{ 'line-cap': 'round' }}
          paint={{
            'line-color': currentColorExpression('#e05252', '#3b82f6'),
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4.5, 2.5],
          }}
        />
      </Source>
      {data && data.features.map((f, i) => {
        const cs = f.geometry.coordinates;
        const a = cs[cs.length - 2];
        const b = cs[cs.length - 1];
        if (!isFrontFacing(center, b)) return null;
        const deg = bearing(a, b) - 90; // '➤' points east by default
        const color = f.properties.type === 'warm' ? '#e05252' : '#3b82f6';
        return (
          <Marker key={i} longitude={b[0]} latitude={b[1]}>
            <span style={{ display: 'inline-block', fontSize: 16, color, transform: `rotate(${deg}deg)`, pointerEvents: 'none' }}>➤</span>
          </Marker>
        );
      })}
    </>
  );
}

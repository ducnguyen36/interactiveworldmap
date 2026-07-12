import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { mapcolor7Expression } from '../../lib/mapExpressions.js';
import { countryLabelPoints, oceanLabelPoints } from '../../lib/labelPoints.js';
import { assetUrl } from '../../lib/assetUrl.js';

const FONT = ['Klokantech Noto Sans Regular'];

export default function PoliticalLayer() {
  const { mode } = useLanguage();
  // Raw data (cached app-wide) drives label placement and full-geometry lookups.
  const { data: countries } = useGeoData('/data/countries.geojson');
  const { data: oceans } = useGeoData('/data/oceans.json');

  const countryLabels = useMemo(() => (countries ? countryLabelPoints(countries, mode) : null), [countries, mode]);
  const oceanLabels = useMemo(() => (oceans ? oceanLabelPoints(oceans, mode) : null), [oceans, mode]);
  const fillColor = useMemo(() => mapcolor7Expression(), []);

  return (
    <>
      <Source id="countries" type="geojson" data={assetUrl('data/countries.geojson')} generateId>
        <Layer
          id="political-fill"
          type="fill"
          paint={{
            'fill-color': fillColor,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false], 0.8,
              1,
            ],
          }}
        />
        <Layer
          id="political-border"
          type="line"
          paint={{
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#2563eb', '#7a8288'],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0.6],
          }}
        />
      </Source>
      {countryLabels && (
        <Source id="country-labels" type="geojson" data={countryLabels}>
          <Layer
            id="country-label-text"
            type="symbol"
            layout={{ 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 12 }}
            paint={{ 'text-color': '#1f2933', 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.2 }}
          />
        </Source>
      )}
      {oceanLabels && (
        <Source id="ocean-labels" type="geojson" data={oceanLabels}>
          <Layer
            id="ocean-label-text"
            type="symbol"
            layout={{ 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 13, 'text-letter-spacing': 0.1 }}
            paint={{ 'text-color': '#2f6fb0', 'text-opacity': 0.8 }}
          />
        </Source>
      )}
    </>
  );
}

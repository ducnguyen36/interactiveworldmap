import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { mapcolor7Expression } from '../../lib/mapExpressions.js';
import { countryLabelPoints, oceanLabelPoints } from '../../lib/labelPoints.js';
import { BORDER_COLORS, LABEL_COLORS } from '../../lib/mapStyle.js';

const FONT = ['Klokantech Noto Sans Regular'];
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

export default function PoliticalLayer() {
  const { mode } = useLanguage();
  const { theme } = useTheme();
  // Raw data (cached app-wide) is the single fetch: it feeds the map source directly
  // AND drives label placement / full-geometry lookups.
  const { data: countries } = useGeoData('/data/countries.geojson');
  const { data: oceans } = useGeoData('/data/oceans.json');

  const countryLabels = useMemo(() => (countries ? countryLabelPoints(countries, mode) : null), [countries, mode]);
  const oceanLabels = useMemo(() => (oceans ? oceanLabelPoints(oceans, mode) : null), [oceans, mode]);
  const fillColor = useMemo(() => mapcolor7Expression(), []);

  // Theme-derived paints: react-map-gl diffs paint props and applies them via
  // setPaintProperty, so a theme flip restyles without reloading the source.
  const border = BORDER_COLORS[theme] ?? BORDER_COLORS.light;
  const label = LABEL_COLORS[theme] ?? LABEL_COLORS.light;

  return (
    <>
      <Source id="countries" type="geojson" data={countries ?? EMPTY_FC} generateId>
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
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#2563eb', border],
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
            paint={{ 'text-color': label.text, 'text-halo-color': label.halo, 'text-halo-width': 1.2 }}
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

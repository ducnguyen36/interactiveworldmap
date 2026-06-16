import { useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useSelection } from '../../context/SelectionContext.jsx';
import { dualText } from '../../lib/dualText.js';

export default function PoliticalLayer() {
  const { data } = useGeoData('/data/countries.geojson');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  const map = useMap();
  const geoRef = useRef(null);

  if (!data) return null;

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const label = dualText(p.NAME_VI, p.NAME_EN, mode);
    const isMajor = (p.LABELRANK ?? 9) <= 2;
    layer.bindTooltip(label, isMajor
      ? { permanent: true, direction: 'center', className: 'country-label' }
      : { sticky: true });
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 1.2 }),
      mouseout: (e) => geoRef.current?.resetStyle(e.target),
      click: () => {
        setSelected({
          wikidata: p.WIKIDATAID || null,
          iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
          nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
        });
        map.fitBounds(layer.getBounds(), { animate: true, maxZoom: 5, padding: [20, 20] });
      },
    });
  };

  return (
    <GeoJSON
      key={mode}
      ref={geoRef}
      data={data}
      onEachFeature={onEachFeature}
      style={() => ({ className: 'country', fillOpacity: 1, weight: 0.5 })}
    />
  );
}

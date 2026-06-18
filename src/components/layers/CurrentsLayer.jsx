import L from 'leaflet';
import { GeoJSON, Marker } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { useSelection } from '../../context/SelectionContext.jsx';
import { bearing } from '../../lib/bearing.js';
import { boundsToObj } from '../../lib/bounds.js';

export default function CurrentsLayer() {
  const { data } = useGeoData('/data/currents.geojson');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  if (!data) return null;

  return (
    <>
      <GeoJSON
        key={mode}
        data={data}
        style={(f) => ({ className: f.properties.type === 'warm' ? 'current-warm' : 'current-cold', weight: 2.5 })}
        onEachFeature={(f, layer) => {
          const p = f.properties;
          layer.bindTooltip(dualText(p.name_vi, p.name_en, mode), { sticky: true });
          layer.on('click', () => setSelected({ kind: 'current', nameVi: p.name_vi, nameEn: p.name_en, type: p.type, focus: { bounds: boundsToObj(layer.getBounds()) } }));
        }}
      />
      {data.features.map((f, i) => {
        const cs = f.geometry.coordinates;
        const a = cs[cs.length - 2];
        const b = cs[cs.length - 1];
        const deg = bearing(a, b) - 90; // '➤' glyph points east (90°) by default
        const cls = f.properties.type === 'warm' ? 'arrow-warm' : 'arrow-cold';
        return (
          <Marker
            key={i}
            position={[b[1], b[0]]}
            interactive={false}
            icon={L.divIcon({
              className: 'current-arrow',
              html: `<span class="${cls}" style="display:inline-block;font-size:16px;transform:rotate(${deg}deg)">➤</span>`,
              iconSize: [16, 16],
            })}
          />
        );
      })}
    </>
  );
}

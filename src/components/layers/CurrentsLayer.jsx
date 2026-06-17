import L from 'leaflet';
import { GeoJSON, Marker } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { bearing } from '../../lib/bearing.js';

export default function CurrentsLayer() {
  const { data } = useGeoData('/data/currents.geojson');
  const { mode } = useLanguage();
  if (!data) return null;

  return (
    <>
      <GeoJSON
        key={mode}
        data={data}
        style={(f) => ({ className: f.properties.type === 'warm' ? 'current-warm' : 'current-cold', weight: 2.5 })}
        onEachFeature={(f, layer) =>
          layer.bindTooltip(dualText(f.properties.name_vi, f.properties.name_en, mode), { sticky: true })
        }
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

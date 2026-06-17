import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { COMMODITIES } from '../../data/commodities.js';
import { useSelection } from '../../context/SelectionContext.jsx';

export default function AgricultureLayer() {
  const { data } = useGeoData('/data/agriculture.json');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  if (!data) return null;

  return (
    <>
      {COMMODITIES.flatMap((c) =>
        (data[c.id] || []).map((loc, i) => (
          <Marker
            key={`${c.id}-${i}`}
            position={loc.coord}
            eventHandlers={{ click: () => setSelected({ kind: 'commodity', id: c.id, vi: c.vi, en: c.en, icon: c.icon, iso2: loc.iso2 }) }}
            icon={L.divIcon({
              className: 'ag-marker',
              html: `<span style="font-size:16px">${c.icon}</span>`,
              iconSize: [20, 20],
            })}
          >
            <Tooltip sticky>{dualText(c.vi, c.en, mode)}</Tooltip>
          </Marker>
        ))
      )}
    </>
  );
}

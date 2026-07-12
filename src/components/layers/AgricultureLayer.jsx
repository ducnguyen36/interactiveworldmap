import { Marker } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useSelection } from '../../context/SelectionContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { COMMODITIES } from '../../data/commodities.js';
import { isFrontFacing } from '../../lib/isFrontFacing.js';

export default function AgricultureLayer({ center = [0, 20] }) {
  const { data } = useGeoData('/data/agriculture.json');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  if (!data) return null;

  return (
    <>
      {COMMODITIES.flatMap((c) =>
        (data[c.id] || []).map((loc, i) => {
          const lngLat = [loc.coord[1], loc.coord[0]]; // agriculture.json stores [lat, lng]
          if (!isFrontFacing(center, lngLat)) return null;
          const label = dualText(c.vi, c.en, mode);
          return (
            <Marker
              key={`${c.id}-${i}`}
              longitude={lngLat[0]}
              latitude={lngLat[1]}
              onClick={(e) => {
                e.originalEvent?.stopPropagation?.();
                setSelected({ kind: 'commodity', id: c.id, vi: c.vi, en: c.en, icon: c.icon, iso2: loc.iso2, focus: { center: lngLat } });
              }}
            >
              <button type="button" title={label} aria-label={label}
                      className="text-base leading-none p-1.5 cursor-pointer bg-transparent border-0">
                {c.icon}
              </button>
            </Marker>
          );
        })
      )}
    </>
  );
}

import { useGeoData } from '../hooks/useGeoData.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { dualText } from '../lib/dualText.js';
import { COMMODITIES } from '../data/commodities.js';
import { commoditiesForCountry, volcanoCountInBounds } from '../lib/countryFacts.js';

export default function CountryLayerFacts({ iso2, bounds, activeOverlayIds }) {
  const { mode, tt } = useLanguage();
  const agActive = activeOverlayIds.has('agriculture');
  const tecActive = activeOverlayIds.has('tectonic');
  const climateActive = activeOverlayIds.has('climate');
  const currentsActive = activeOverlayIds.has('currents');

  const { data: agData } = useGeoData(agActive ? '/data/agriculture.json' : null);
  const { data: volData } = useGeoData(tecActive ? '/data/volcanoes.geojson' : null);

  if (!agActive && !tecActive && !climateActive && !currentsActive) return null;

  const commodities = agData
    ? commoditiesForCountry(agData, iso2).map((id) => COMMODITIES.find((c) => c.id === id)).filter(Boolean)
    : [];
  const volcanoCount = volData ? volcanoCountInBounds(volData, bounds) : null;

  return (
    <div className="mt-4 border-t pt-3 space-y-2">
      <h3 className="font-semibold text-sm">{tt('panel.layerDetails')}</h3>

      {agActive && commodities.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">{tt('panel.agricultureProducts')}: </span>
          {commodities.map((c) => `${c.icon} ${dualText(c.vi, c.en, mode)}`).join(', ')}
        </p>
      )}

      {tecActive && volcanoCount != null && (
        <p className="text-sm">
          <span className="font-semibold">{tt('panel.volcanoes')}: </span>{volcanoCount}
        </p>
      )}

      {climateActive && <p className="text-sm opacity-70">{tt('panel.climateNote')}</p>}
      {currentsActive && <p className="text-sm opacity-70">{tt('panel.currentsNote')}</p>}
    </div>
  );
}

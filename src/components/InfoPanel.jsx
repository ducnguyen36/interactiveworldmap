import { useLanguage } from '../context/LanguageContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import { useWikiInfo } from '../hooks/useWikiInfo.js';
import { useWikiSummary } from '../hooks/useWikiSummary.js';
import { useGeoData } from '../hooks/useGeoData.js';
import { dualText } from '../lib/dualText.js';
import { climateClass } from '../lib/climate.js';
import { featureWikiTitles } from '../lib/featureTitles.js';
import WikiExtracts from './WikiExtracts.jsx';
import CountryLayerFacts from './CountryLayerFacts.jsx';

export default function InfoPanel({ injectedSelection, activeOverlayIds = new Set() }) {
  const { mode, tt } = useLanguage();
  const { selected, setSelected } = useSelection();
  const feature = injectedSelection !== undefined ? injectedSelection : selected;
  const kind = (feature && feature.kind) || 'country';

  // Country: Wikidata + Wikipedia (only for country kind).
  const wiki = useWikiInfo(feature && kind === 'country' ? feature : null, mode);

  // Commodity needs its country's name (from cached countries data) to build the title.
  const { data: countries } = useGeoData(kind === 'commodity' ? '/data/countries.geojson' : null);
  let countryName = null;
  if (kind === 'commodity' && countries) {
    const cf = countries.features.find((x) => x.properties.ISO_A2 === feature.iso2);
    if (cf) countryName = { vi: cf.properties.NAME_VI, en: cf.properties.NAME_EN };
  }
  const summary = useWikiSummary(feature && kind !== 'country' ? featureWikiTitles(feature, countryName) : null, mode);

  if (!feature) return null;

  const title =
    kind === 'volcano' ? (feature.name || '') :
    kind === 'climate' ? (feature.code || '') :
    kind === 'commodity' ? dualText(feature.vi, feature.en, mode) :
    dualText(feature.nameVi, feature.nameEn, mode);

  const climateGroup = kind === 'climate' ? climateClass(feature.code).group : null;
  const featureLabel =
    kind === 'current' ? tt(feature.type === 'warm' ? 'legend.warmCurrent' : 'legend.coldCurrent') :
    kind === 'volcano' ? tt('legend.volcano') :
    kind === 'climate' ? (['A', 'B', 'C', 'D', 'E'].includes(climateGroup) ? tt(`legend.climate${climateGroup}`) : null) :
    kind === 'commodity' ? `${tt('panel.majorProducer')}${countryName ? ': ' + dualText(countryName.vi, countryName.en, mode) : ''}` :
    null;

  return (
    <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] z-[1000] overflow-y-auto shadow-2xl p-4"
           style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <button onClick={() => setSelected(null)} className="float-right text-xl leading-none"
              aria-label={tt('panel.close')}>×</button>

      <h2 className="text-lg font-bold pr-6">
        {kind === 'commodity' && <span className="mr-1">{feature.icon}</span>}
        {title}
      </h2>

      {kind === 'country' ? (
        <>
          {wiki.loading && <p className="mt-4 opacity-70">{tt('panel.loading')}</p>}
          {wiki.error && (
            <div className="mt-4">
              <p className="opacity-70">{tt('panel.noData')}</p>
              <button onClick={wiki.retry} className="mt-2 px-3 py-1 rounded border">{tt('panel.retry')}</button>
            </div>
          )}
          {wiki.data && !wiki.loading && (
            <div className="mt-3 space-y-3">
              {wiki.data.flag && <img src={wiki.data.flag} alt="" className="w-24 border" />}
              {wiki.data.capital && (
                <p><span className="font-semibold">{tt('panel.capital')}: </span>
                  {dualText(wiki.data.capital.vi, wiki.data.capital.en, mode)}</p>
              )}
              {wiki.data.population != null && (
                <p><span className="font-semibold">{tt('panel.population')}: </span>
                  {wiki.data.population.toLocaleString(mode === 'en' ? 'en-US' : 'vi-VN')}</p>
              )}
              <WikiExtracts extracts={wiki.data.extracts} />
            </div>
          )}
          <CountryLayerFacts iso2={feature.iso2} bounds={feature.bounds} activeOverlayIds={activeOverlayIds} />
        </>
      ) : (
        <div className="mt-3 space-y-3">
          {featureLabel && <p className="text-sm font-semibold opacity-80">{featureLabel}</p>}
          {summary.loading && <p className="opacity-70">{tt('panel.loading')}</p>}
          {!summary.loading && summary.extracts.length === 0 && (
            <div>
              <p className="opacity-70">{tt('panel.noData')}</p>
              <button onClick={summary.retry} className="mt-2 px-3 py-1 rounded border">{tt('panel.retry')}</button>
            </div>
          )}
          <WikiExtracts extracts={summary.extracts} />
        </div>
      )}
    </aside>
  );
}

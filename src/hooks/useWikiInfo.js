import { useEffect, useState, useCallback, useMemo } from 'react';
import { entitiesUrl, getEntity, claimEntityId, label, siteTitle } from '../lib/wikidata.js';
import { summaryUrl, parseSummary } from '../lib/wikipedia.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function flagUrl(iso2) {
  return iso2 ? `https://flagcdn.com/w160/${iso2.toLowerCase()}.png` : null;
}

async function load(feature, langs) {
  const result = {
    name: { vi: feature.nameVi, en: feature.nameEn },
    flag: flagUrl(feature.iso2),
    capital: null,
    population: feature.population ?? null,
    extracts: [],
  };
  const titles = { vi: feature.nameVi, en: feature.nameEn };

  if (feature.wikidata) {
    try {
      const json = await getJson(entitiesUrl([feature.wikidata], ['vi', 'en']));
      const entity = getEntity(json, feature.wikidata);
      for (const l of ['vi', 'en']) titles[l] = siteTitle(entity, l) || titles[l];
      const capId = claimEntityId(entity, 'P36');
      if (capId) {
        const capJson = await getJson(entitiesUrl([capId], ['vi', 'en']));
        const capEntity = getEntity(capJson, capId);
        result.capital = { vi: label(capEntity, 'vi'), en: label(capEntity, 'en') };
      }
    } catch { /* keep name fallbacks */ }
  }

  for (const l of langs) {
    if (!titles[l]) continue;
    try {
      const summary = parseSummary(await getJson(summaryUrl(l, titles[l])));
      if (summary) result.extracts.push({ lang: l, ...summary });
    } catch { /* skip this language */ }
  }
  return result;
}

export function useWikiInfo(feature, mode) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const langs = useMemo(() => (mode === 'dual' ? ['vi', 'en'] : [mode]), [mode]);

  const run = useCallback(() => {
    if (!feature) { setState({ data: null, loading: false, error: null }); return () => {}; }
    let active = true;
    setState({ data: null, loading: true, error: null });
    load(feature, langs)
      .then((data) => { if (active) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (active) setState({ data: null, loading: false, error }); });
    return () => { active = false; };
  }, [feature, langs]);

  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}

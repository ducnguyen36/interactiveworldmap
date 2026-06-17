import { useEffect, useState, useCallback, useMemo } from 'react';
import { summaryUrl, parseSummary } from '../lib/wikipedia.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function firstSummary(lang, candidates) {
  for (const title of candidates || []) {
    if (!title) continue;
    try {
      const s = parseSummary(await getJson(summaryUrl(lang, title)));
      if (s) return { lang, ...s };
    } catch { /* try next candidate */ }
  }
  return null;
}

async function load(titles, langs) {
  const extracts = [];
  for (const lang of langs) {
    const s = await firstSummary(lang, titles[lang]);
    if (s) extracts.push(s);
  }
  if (extracts.length === 0 && !langs.includes('en')) {
    const s = await firstSummary('en', titles.en);
    if (s) extracts.push(s);
  }
  return extracts;
}

export function useWikiSummary(titles, mode) {
  const [state, setState] = useState({ extracts: [], loading: false, error: null });
  const langs = useMemo(() => (mode === 'dual' ? ['vi', 'en'] : [mode]), [mode]);
  const key = titles ? JSON.stringify(titles) : null;

  const run = useCallback(() => {
    if (!titles) { setState({ extracts: [], loading: false, error: null }); return () => {}; }
    let active = true;
    setState({ extracts: [], loading: true, error: null });
    load(titles, langs)
      .then((extracts) => { if (active) setState({ extracts, loading: false, error: null }); })
      .catch((error) => { if (active) setState({ extracts: [], loading: false, error }); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, langs]);

  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}

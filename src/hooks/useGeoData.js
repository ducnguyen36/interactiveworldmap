import { useEffect, useState } from 'react';

const cache = new Map();
export function _clearGeoCache() { cache.clear(); }

// Resolve a root-absolute "/data/..." path against Vite's base URL so it works
// at a host root and under a subpath (GitHub Pages). External/relative URLs pass through.
function resolveUrl(url) {
  if (url && url.startsWith('/')) return import.meta.env.BASE_URL + url.slice(1);
  return url;
}

export function useGeoData(url) {
  const resolved = resolveUrl(url);
  const [state, setState] = useState(() =>
    resolved && cache.has(resolved)
      ? { data: cache.get(resolved), loading: false, error: null }
      : { data: null, loading: !!resolved, error: null }
  );

  useEffect(() => {
    if (!resolved) { setState({ data: null, loading: false, error: null }); return; }
    if (cache.has(resolved)) {
      setState({ data: cache.get(resolved), loading: false, error: null });
      return;
    }
    let active = true;
    setState({ data: null, loading: true, error: null });
    fetch(resolved)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cache.set(resolved, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error });
      });
    return () => { active = false; };
  }, [resolved]);

  return state;
}

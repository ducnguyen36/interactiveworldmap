import { useEffect, useState } from 'react';

const cache = new Map();
export function _clearGeoCache() { cache.clear(); }

export function useGeoData(url) {
  const [state, setState] = useState(() =>
    cache.has(url)
      ? { data: cache.get(url), loading: false, error: null }
      : { data: null, loading: true, error: null }
  );

  useEffect(() => {
    if (cache.has(url)) {
      setState({ data: cache.get(url), loading: false, error: null });
      return;
    }
    let active = true;
    setState({ data: null, loading: true, error: null });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cache.set(url, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error });
      });
    return () => { active = false; };
  }, [url]);

  return state;
}

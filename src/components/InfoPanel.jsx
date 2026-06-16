import { useLanguage } from '../context/LanguageContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import { useWikiInfo } from '../hooks/useWikiInfo.js';
import { dualText } from '../lib/dualText.js';

export default function InfoPanel({ injectedSelection }) {
  const { mode, tt } = useLanguage();
  const { selected, setSelected } = useSelection();
  const feature = injectedSelection !== undefined ? injectedSelection : selected;
  const { data, loading, error, retry } = useWikiInfo(feature, mode);

  if (!feature) return null;

  return (
    <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] z-[1000] overflow-y-auto shadow-2xl p-4"
           style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <button onClick={() => setSelected(null)} className="float-right text-xl leading-none"
              aria-label={tt('panel.close')}>×</button>

      <h2 className="text-lg font-bold pr-6">{dualText(feature.nameVi, feature.nameEn, mode)}</h2>

      {loading && <p className="mt-4 opacity-70">{tt('panel.loading')}</p>}

      {error && (
        <div className="mt-4">
          <p className="opacity-70">{tt('panel.noData')}</p>
          <button onClick={retry} className="mt-2 px-3 py-1 rounded border">{tt('panel.retry')}</button>
        </div>
      )}

      {data && !loading && (
        <div className="mt-3 space-y-3">
          {data.flag && <img src={data.flag} alt="" className="w-24 border" />}
          {data.capital && (
            <p><span className="font-semibold">{tt('panel.capital')}: </span>
              {dualText(data.capital.vi, data.capital.en, mode)}</p>
          )}
          {data.population != null && (
            <p><span className="font-semibold">{tt('panel.population')}: </span>
              {data.population.toLocaleString(mode === 'en' ? 'en-US' : 'vi-VN')}</p>
          )}
          {data.extracts.map((ex) => (
            <div key={ex.lang}>
              {ex.thumbnail && <img src={ex.thumbnail} alt="" className="float-right ml-2 w-16 rounded" />}
              <p className="text-sm leading-relaxed">{ex.extract}</p>
              <a className="text-sm text-blue-500 underline"
                 href={`https://${ex.lang}.wikipedia.org/wiki/${encodeURIComponent(ex.title)}`}
                 target="_blank" rel="noreferrer">{tt('panel.readMore')}</a>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

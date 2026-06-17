import { useLanguage } from '../context/LanguageContext.jsx';

export default function WikiExtracts({ extracts }) {
  const { tt } = useLanguage();
  if (!extracts || extracts.length === 0) return null;
  return (
    <div className="space-y-3">
      {extracts.map((ex) => (
        <div key={ex.lang}>
          {ex.thumbnail && <img src={ex.thumbnail} alt="" className="float-right ml-2 w-16 rounded" />}
          <p className="text-sm leading-relaxed">{ex.extract}</p>
          {ex.title && (
            <a className="text-sm text-blue-500 underline"
               href={`https://${ex.lang}.wikipedia.org/wiki/${encodeURIComponent(ex.title)}`}
               target="_blank" rel="noreferrer">{tt('panel.readMore')}</a>
          )}
        </div>
      ))}
    </div>
  );
}

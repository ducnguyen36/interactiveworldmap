import { baseLayers, overlayLayers } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function LayerControl({ activeBaseId, setActiveBaseId, activeOverlayIds, toggleOverlay }) {
  const { tt } = useLanguage();
  return (
    <div className="absolute top-4 left-4 z-[1000] rounded-lg shadow-lg p-3 text-sm"
         style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h2 className="font-semibold mb-2">{tt('control.title')}</h2>
      <p className="uppercase text-xs opacity-60 mb-1">{tt('control.base')}</p>
      {baseLayers().map((l) => (
        <label key={l.id} className="flex items-center gap-2 mb-1 cursor-pointer">
          <input type="radio" name="base" checked={activeBaseId === l.id}
                 onChange={() => setActiveBaseId(l.id)} />
          <span>{tt(l.labelKey)}</span>
        </label>
      ))}
      <p className="uppercase text-xs opacity-60 mt-2 mb-1">{tt('control.overlays')}</p>
      {overlayLayers().map((l) => (
        <label key={l.id}
               className={`flex items-center gap-2 mb-1 ${l.disabled ? 'opacity-40' : 'cursor-pointer'}`}>
          <input type="checkbox" disabled={l.disabled}
                 checked={activeOverlayIds.has(l.id)}
                 onChange={() => toggleOverlay(l.id)} />
          <span>{tt(l.labelKey)}{l.disabled ? ` (${tt('control.comingSoon')})` : ''}</span>
        </label>
      ))}
    </div>
  );
}

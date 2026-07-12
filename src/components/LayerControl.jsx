import { useState } from 'react';
import { baseLayers, overlayLayers } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function LayerControl({ activeBaseId, setActiveBaseId, activeOverlayIds, toggleOverlay }) {
  const { tt } = useLanguage();
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  return (
    <div className="absolute top-4 left-14 z-[1000]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tt('control.title')}
              className="rounded-lg shadow-lg px-3 py-2 min-h-11 min-w-11 text-lg"
              style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
        🗺️
      </button>
      {open && (
        <div className="mt-2 rounded-lg shadow-lg p-4 text-base max-h-[70vh] overflow-y-auto"
             style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
          <h2 className="font-semibold mb-2">{tt('control.title')}</h2>
          <p className="uppercase text-xs opacity-60 mb-1">{tt('control.base')}</p>
          {baseLayers().map((l) => (
            <label key={l.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="radio" name="base" className="w-5 h-5" checked={activeBaseId === l.id}
                     onChange={() => setActiveBaseId(l.id)} />
              <span>{tt(l.labelKey)}</span>
            </label>
          ))}
          <p className="uppercase text-xs opacity-60 mt-3 mb-1">{tt('control.overlays')}</p>
          {overlayLayers().map((l) => (
            <label key={l.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={activeOverlayIds.has(l.id)}
                     onChange={() => toggleOverlay(l.id)} />
              <span>{tt(l.labelKey)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

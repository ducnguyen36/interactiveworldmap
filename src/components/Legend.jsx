import { useState } from 'react';
import { LAYERS } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { dualText } from '../lib/dualText.js';

function swatchStyle(item) {
  const base = { background: item.swatch, width: '16px', display: 'inline-block' };
  if (item.shape === 'line') return { ...base, height: '3px' };
  if (item.shape === 'dot') return { ...base, height: '14px', borderRadius: '50%' };
  return { ...base, height: '12px' };
}

export default function Legend({ activeOverlayIds = new Set() }) {
  const { mode, tt } = useLanguage();
  const active = LAYERS.filter((l) => l.legend && activeOverlayIds.has(l.id));
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  if (active.length === 0) return null;

  const labelOf = (item) =>
    item.labelKey ? tt(item.labelKey) : dualText(item.label.vi, item.label.en, mode);

  return (
    <div className="absolute bottom-6 left-4 z-[1000]">
      {open && (
        <div className="mb-2 rounded-lg shadow-lg p-3 text-xs max-h-[40vh] overflow-y-auto"
             style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
          {active.map((l) => (
            <div key={l.id} className="mb-2 last:mb-0">
              <p className="font-semibold mb-1">{tt(l.labelKey)}</p>
              {l.legend.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-0.5">
                  {item.icon
                    ? <span className="w-4 text-center">{item.icon}</span>
                    : <span style={swatchStyle(item)} />}
                  <span>{labelOf(item)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tt('control.legend')}
              className="rounded-lg shadow-lg px-3 py-2 min-h-11 min-w-11 text-lg"
              style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
        ℹ️
      </button>
    </div>
  );
}

import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MODES = [
  { id: 'vi', labelKey: 'lang.vietnamese', flags: ['vn'] },
  { id: 'en', labelKey: 'lang.english', flags: ['gb'] },
  { id: 'dual', labelKey: 'lang.dual', flags: ['vn', 'gb'] },
];

export default function Header() {
  const { mode, setMode, tt } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-2 shadow z-[1000] relative"
            style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h1 className="font-bold">{tt('app.title')}</h1>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={tt(m.labelKey)}
              aria-label={tt(m.labelKey)}
              aria-pressed={mode === m.id}
              className={`flex items-center gap-0.5 rounded border px-1 py-0.5 transition min-h-11 min-w-11
                ${mode === m.id ? 'ring-2 ring-blue-500 opacity-100' : 'opacity-50 hover:opacity-90'}`}
            >
              {m.flags.map((code) => (
                <img key={code} src={`https://flagcdn.com/w40/${code}.png`} alt="" className="h-4 w-auto rounded-sm" />
              ))}
            </button>
          ))}
        </div>
        <button onClick={toggleTheme} aria-label={tt('theme.toggle')} className="border rounded px-2 py-1 min-h-11 min-w-11">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else document.documentElement.requestFullscreen?.();
          }}
          aria-label={tt('kiosk.fullscreen')} title={tt('kiosk.fullscreen')}
          className="border rounded px-2 py-1 min-h-11 min-w-11"
        >⛶</button>
      </div>
    </header>
  );
}

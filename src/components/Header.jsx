import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MODES = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
  { id: 'dual', label: 'Song ngữ' },
];

export default function Header() {
  const { mode, setMode, tt } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-2 shadow z-[1000] relative"
            style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h1 className="font-bold">{tt('app.title')}</h1>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="lang">{tt('lang.label')}</label>
        <select id="lang" value={mode} onChange={(e) => setMode(e.target.value)}
                className="border rounded px-2 py-1 bg-transparent">
          {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button onClick={toggleTheme} aria-label={tt('theme.toggle')}
                className="border rounded px-2 py-1">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

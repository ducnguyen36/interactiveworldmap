import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import i18n from '../i18n/index.js';
import { dualText } from '../lib/dualText.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'iwm.lang';

export function LanguageProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'vi');

  useEffect(() => {
    i18n.changeLanguage(mode === 'en' ? 'en' : 'vi');
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const tt = useCallback((key) => {
    const tvi = i18n.getFixedT('vi');
    const ten = i18n.getFixedT('en');
    return dualText(tvi(key), ten(key), mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, tt }), [mode, setMode, tt]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

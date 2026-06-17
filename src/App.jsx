import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { SelectionProvider } from './context/SelectionContext.jsx';
import { baseLayers } from './data/layers.js';
import Header from './components/Header.jsx';
import LayerControl from './components/LayerControl.jsx';
import MapView from './components/MapView.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import Legend from './components/Legend.jsx';

export default function App() {
  const [activeBaseId, setActiveBaseId] = useState(
    baseLayers().find((l) => l.enabledByDefault)?.id ?? 'political'
  );
  const [activeOverlayIds, setActiveOverlayIds] = useState(() => new Set());

  const toggleOverlay = (id) =>
    setActiveOverlayIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SelectionProvider>
          <div className="flex flex-col h-full">
            <Header />
            <main className="relative flex-1">
              <MapView activeBaseId={activeBaseId} activeOverlayIds={activeOverlayIds} />
              <LayerControl
                activeBaseId={activeBaseId} setActiveBaseId={setActiveBaseId}
                activeOverlayIds={activeOverlayIds} toggleOverlay={toggleOverlay}
              />
              <Legend activeOverlayIds={activeOverlayIds} />
              <InfoPanel />
            </main>
          </div>
        </SelectionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

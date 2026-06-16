import PoliticalLayer from '../components/layers/PoliticalLayer.jsx';
import TectonicLayer from '../components/layers/TectonicLayer.jsx';

export const LAYERS = [
  { id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true, component: PoliticalLayer },
  { id: 'tectonic', labelKey: 'layer.tectonic', kind: 'overlay', enabledByDefault: false, component: TectonicLayer },
  { id: 'currents', labelKey: 'layer.currents', kind: 'overlay', disabled: true, component: null },
  { id: 'climate', labelKey: 'layer.climate', kind: 'overlay', disabled: true, component: null },
  { id: 'agriculture', labelKey: 'layer.agriculture', kind: 'overlay', disabled: true, component: null },
];

export const baseLayers = () => LAYERS.filter((l) => l.kind === 'base');
export const overlayLayers = () => LAYERS.filter((l) => l.kind === 'overlay');

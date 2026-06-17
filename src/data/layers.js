import PoliticalLayer from '../components/layers/PoliticalLayer.jsx';
import TectonicLayer from '../components/layers/TectonicLayer.jsx';
import CurrentsLayer from '../components/layers/CurrentsLayer.jsx';
import ClimateLayer from '../components/layers/ClimateLayer.jsx';
import AgricultureLayer from '../components/layers/AgricultureLayer.jsx';
import { COMMODITIES } from './commodities.js';
import { climateClass } from '../lib/climate.js';

export const LAYERS = [
  { id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true, component: PoliticalLayer },
  {
    id: 'tectonic', labelKey: 'layer.tectonic', kind: 'overlay', component: TectonicLayer,
    legend: { items: [
      { swatch: 'var(--plate)', shape: 'line', labelKey: 'legend.plateBoundary' },
      { swatch: 'var(--volcano)', shape: 'dot', labelKey: 'legend.volcano' },
    ] },
  },
  {
    id: 'currents', labelKey: 'layer.currents', kind: 'overlay', component: CurrentsLayer,
    legend: { items: [
      { swatch: 'var(--current-warm)', shape: 'line', labelKey: 'legend.warmCurrent' },
      { swatch: 'var(--current-cold)', shape: 'line', labelKey: 'legend.coldCurrent' },
    ] },
  },
  {
    id: 'climate', labelKey: 'layer.climate', kind: 'overlay', component: ClimateLayer,
    legend: { items: ['A', 'B', 'C', 'D', 'E'].map((g) => ({
      swatch: climateClass(g).color,
      labelKey: `legend.climate${g}`,
    })) },
  },
  {
    id: 'agriculture', labelKey: 'layer.agriculture', kind: 'overlay', component: AgricultureLayer,
    legend: { items: COMMODITIES.map((c) => ({ icon: c.icon, label: { vi: c.vi, en: c.en } })) },
  },
];

export const baseLayers = () => LAYERS.filter((l) => l.kind === 'base');
export const overlayLayers = () => LAYERS.filter((l) => l.kind === 'overlay');

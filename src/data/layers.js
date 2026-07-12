import PoliticalLayer from '../components/layers/PoliticalLayer.jsx';
import TectonicLayer from '../components/layers/TectonicLayer.jsx';
import CurrentsLayer from '../components/layers/CurrentsLayer.jsx';
import ClimateLayer from '../components/layers/ClimateLayer.jsx';
import AgricultureLayer from '../components/layers/AgricultureLayer.jsx';
import { COMMODITIES } from './commodities.js';
import { climateClass } from '../lib/climate.js';
import { geojsonBounds } from '../lib/geojsonBounds.js';
import { fullGeometry } from '../lib/fullGeometry.js';

export const LAYERS = [
  {
    id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true,
    component: PoliticalLayer,
    interactiveLayerIds: ['political-fill'],
    selectFeature: (feature) => {
      const p = feature.properties;
      const bounds = geojsonBounds(fullGeometry('/data/countries.geojson', feature) ?? feature.geometry);
      return {
        kind: 'country',
        wikidata: p.WIKIDATAID || null,
        iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
        nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
        bounds,
        focus: bounds ? { bounds } : null,
      };
    },
  },
  {
    id: 'climate', labelKey: 'layer.climate', kind: 'overlay', component: ClimateLayer,
    legend: { items: ['A', 'B', 'C', 'D', 'E'].map((g) => ({
      swatch: climateClass(g).color,
      labelKey: `legend.climate${g}`,
    })) },
  },
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
    id: 'agriculture', labelKey: 'layer.agriculture', kind: 'overlay', component: AgricultureLayer,
    legend: { items: COMMODITIES.map((c) => ({ icon: c.icon, label: { vi: c.vi, en: c.en } })) },
  },
];

export const baseLayers = () => LAYERS.filter((l) => l.kind === 'base');
export const overlayLayers = () => LAYERS.filter((l) => l.kind === 'overlay');

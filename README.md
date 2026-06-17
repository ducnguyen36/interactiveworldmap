# Interactive World Map (Bản đồ Thế giới Tương tác)

An interactive, vector world map for Vietnamese geography/geology teachers. Vietnamese
labels by default, click-to-zoom, a Wikipedia/Wikidata info panel, toggleable thematic
layers (Political + Tectonic), VI/EN/Dual language, and light/dark themes.

## Requirements
- Node.js 18+

## Setup
```bash
npm install
node scripts/fetch-data.mjs   # only needed if public/data/ is empty; data is committed
npm run dev                   # http://localhost:5173
```

## Scripts
- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run test` — run the unit/component tests (Vitest)

## How it works
- **Base map:** Natural Earth country polygons rendered as GeoJSON (no tiles, no API keys).
- **Labels:** `NAME_VI` / `NAME_EN` from Natural Earth, switched by language mode.
- **Layers:** Political (base) + four overlays — Tectonic (plates + volcanoes), Ocean
  Currents (warm/cold arrows), Climate Zones (Köppen, translucent), and Agriculture
  (commodity markers). The Layer Control and Legend are both driven by `src/data/layers.js`.
- **Info panel:** flag (flagcdn by ISO code), population (`POP_EST`), capital + article
  titles (Wikidata), and the intro extract (Wikipedia REST summary).
- **Themes:** the `dark` class on `<html>` toggles CSS variables used by both Tailwind
  and the Leaflet SVG. Language switcher uses flag images (`flagcdn`).

## Adding a new layer
1. Build a component in `src/components/layers/` (rendered inside the Leaflet map; it may
   use `useMap()` and `useGeoData()`).
2. Add an entry to `src/data/layers.js`:
   `{ id, labelKey, kind: 'base'|'overlay', component, legend }` and a `layer.<id>` string
   in both `src/i18n/locales/vi.json` and `en.json`.

The Layer Control, map, and Legend pick it up automatically.

## Data sources & licenses
- Countries: Natural Earth (public domain).
- Tectonic plate boundaries: Hugo Ahlenius / Peter Bird (Open Data Commons Attribution).
- Volcanoes: Smithsonian Global Volcanism Program (CC0).
- Climate: Köppen-Geiger classification (circleofconfusion/climate-map, 1976–2000).
- Ocean currents: curated from standard oceanographic references (illustrative, not a
  precise vector field).
- Agriculture: top-producing countries per commodity, curated from FAOSTAT statistics.
- Flags: flagcdn.com. Summaries: Wikipedia / Wikidata APIs.

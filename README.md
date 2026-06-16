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
- **Info panel:** flag (flagcdn by ISO code), population (`POP_EST`), capital + article
  titles (Wikidata), and the intro extract (Wikipedia REST summary).
- **Themes:** the `dark` class on `<html>` toggles CSS variables used by both Tailwind
  and the Leaflet SVG.

## Adding a new layer
1. Build a component in `src/components/layers/` (rendered inside the Leaflet map; it may
   use `useMap()` and `useGeoData()`).
2. Add an entry to `src/data/layers.js`:
   `{ id, labelKey, kind: 'base'|'overlay', component }` and a `layer.<id>` string in
   both `src/i18n/locales/vi.json` and `en.json`.

The Layer Control panel and map pick it up automatically.

## Data sources & licenses
- Countries: Natural Earth `ne_50m_admin_0_countries` (public domain).
- Tectonic plate boundaries: Hugo Ahlenius / Peter Bird (Open Data Commons Attribution).
- Volcanoes: Smithsonian Global Volcanism Program (CC0).
- Flags: flagcdn.com. Summaries: Wikipedia / Wikidata APIs.

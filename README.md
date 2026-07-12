# Interactive World Map (Bản đồ Thế giới Tương tác)

An interactive 3D globe for Vietnamese geography/geology teachers — built for TV
touchscreens and iPads as well as desktops. Vietnamese labels by default, tap-to-focus,
a Wikipedia/Wikidata info panel, five toggleable thematic layers, VI/EN/Dual language,
and light/dark themes.

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
- **Globe:** MapLibre GL renders an interactive 3D globe (drag to spin, pinch to zoom,
  tap to select) purely from bundled GeoJSON — no tiles, no API keys. Works in the
  browser on desktops, iPads, and touch TVs; use the fullscreen button for kiosk use.
- **Labels:** MapLibre symbol layers with bundled Noto Sans glyphs (Latin + Vietnamese),
  regenerable via `node scripts/fetch-glyphs.mjs`.
- **Layers:** Political (base) + four overlays — Tectonic (plates + volcanoes), Ocean
  Currents (warm/cold arrows), Climate Zones (Köppen, translucent), and Agriculture
  (commodity markers). The Layer Control and Legend are both driven by `src/data/layers.js`.
- **Info panel:** flag (flagcdn by ISO code), population (`POP_EST`), capital + article
  titles (Wikidata), and the intro extract (Wikipedia REST summary).
- **Themes:** the `dark` class on `<html>` toggles CSS variables used by Tailwind and the
  globe's theme-reactive paints. Language switcher uses flag images (`flagcdn`).

## Adding a new layer
1. Build a component in `src/components/layers/` rendering react-map-gl
   `<Source>/<Layer>` (or `<Marker>`s) — it receives a `center` prop ([lng, lat]) for
   backside-culling HTML markers on the globe.
2. Add an entry to `src/data/layers.js`:
   `{ id, labelKey, kind: 'base'|'overlay', component, legend, interactiveLayerIds?,
   selectFeature? }` and a `layer.<id>` string in both `src/i18n/locales/vi.json` and
   `en.json`. `interactiveLayerIds` + `selectFeature(feature)` make the layer's features
   tappable (the returned selection drives the info panel and the fly-to focus).

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

# Info Panel — Layer Details Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Builds on:** v1 + v2 (interactive world map), branch `feature/interactive-world-map`.

## Purpose

Enrich the information panel beyond basic country facts so it also surfaces **descriptive,
educational** information about the active layers. Two complementary capabilities (user chose
"both"):
1. **Per-country layer facts** — clicking a country adds, under the basic info, an
   at-a-glance section summarizing the active overlays for that country.
2. **Clickable layer features with real detail** — clicking a map feature (ocean current,
   volcano, agriculture marker) opens the panel showing that feature's **Wikipedia
   description** (extract + thumbnail + read-more), e.g. clicking the coffee marker on India
   shows "Coffee production in India"; clicking a volcano shows that volcano's article;
   clicking a current shows that current's article.

## Scope

### In scope
- Discriminated selection objects (`kind`) for country / current / volcano / commodity.
- InfoPanel branches on `kind`: country view (existing + facts section) vs feature view
  (Wikipedia descriptive content).
- Feature views fetch Wikipedia summaries via resolved title candidates, with English
  fallback when the active language lacks the article.
- `CountryLayerFacts` section: Agriculture (commodities for the country), Tectonic (volcano
  count within country bounds), Climate/Currents (short "see map" notes).
- Clickable currents, volcanoes, agriculture markers (set a feature selection).
- New pure helper `featureWikiTitles` + the two facts helpers + unit tests; new
  `useWikiSummary` hook; i18n strings; App wiring.

### Out of scope (YAGNI)
- Making the climate layer clickable (must stay non-interactive so country clicks pass
  through). Climate is represented via the legend + the country facts note.
- Precise point-in-polygon volcano counting (bbox approximation is sufficient).
- New bundled data files — reuse `agriculture.json`, `volcanoes.geojson`, and the already
  cached `countries.geojson` (for resolving a commodity's country name).

## Selection model

`SelectionContext` keeps the same `{ selected, setSelected }` API; the object shape gains a
`kind` discriminator (defaults to `'country'` when absent — back-compat).

| kind | set by | shape |
|------|--------|-------|
| country | `PoliticalLayer` click | `{ kind:'country', wikidata, iso2, nameVi, nameEn, population, bounds }` |
| current | `CurrentsLayer` click | `{ kind:'current', nameVi, nameEn, type }` |
| volcano | `TectonicLayer` volcano click | `{ kind:'volcano', name }` |
| commodity | `AgricultureLayer` marker click | `{ kind:'commodity', id, vi, en, icon, iso2 }` |

`bounds` is a plain object `{ south, west, north, east }` from Leaflet `layer.getBounds()`.
Feature clicks only `setSelected(...)` — they do NOT zoom (only country clicks zoom).
Overlays render above the base country layer, so feature clicks hit the feature; climate is
`interactive:false` so its clicks pass through to the country.

## Wikipedia title resolution (pure, tested)

`featureWikiTitles(feature, countryName)` → `{ vi: string[], en: string[] }` ordered
candidates (first match wins per language):

- **volcano**: `{ vi:[name], en:[name] }`
- **current**: `{ vi:[nameVi], en:[nameEn] }`
- **commodity** (with `countryName = { vi, en }` resolved from cached countries data):
  - `en: ["{en} production in {countryName.en}", "{en}"]`  (e.g. "Coffee production in India", then "Coffee")
  - `vi: ["{vi}"]`  (Vietnamese niche articles rarely exist; the general commodity article is the realistic vi target)

`countryName` is `null` when the country can't be resolved → commodity falls back to the
general commodity article only.

## Hooks

### useWikiSummary(titles, mode) — new
- `titles` is `{ vi: string[], en: string[] }`.
- `langs = mode === 'dual' ? ['vi','en'] : [mode]`.
- For each active lang, tries its candidate titles in order (`summaryUrl`/`parseSummary`
  from `wikipedia.js`); the first that returns a summary becomes that lang's extract.
- **English fallback:** if, after processing the active langs, there are zero extracts and
  `'en'` was not already active, try the `en` candidates and add that extract (so a
  vi-only user still sees content when no vi article exists).
- Returns `{ extracts: [{ lang, title, extract, thumbnail }], loading, error, retry }`,
  using the same `active`-flag cancellation pattern as `useWikiInfo`/`useGeoData`.
- `titles` is `null` → inert (`{ extracts: [], loading:false }`).

`useWikiInfo` (country) is unchanged.

## Components

### InfoPanel (modified)
- `feature = injectedSelection ?? selected`; `kind = feature.kind || 'country'`.
- `useWikiInfo` is called with the feature ONLY when `kind === 'country'` (else `null`);
  the hook call stays unconditional (passing `null`) per the rules of hooks.
- A `commodity` feature needs its country name: load cached `countries.geojson` via
  `useGeoData` and find `NAME_VI`/`NAME_EN` by `ISO_A2 === feature.iso2` (else `null`).
- Build `titles = featureWikiTitles(feature, countryName)` for non-country kinds and call
  `useWikiSummary(kind === 'country' ? null : titles, mode)` (also unconditional).
- **country**: existing header + flag/capital/population/extract, then
  `<CountryLayerFacts iso2 bounds activeOverlayIds />`.
- **current / volcano / commodity**: a header (current/commodity → `dualText`, volcano →
  name; commodity also shows its icon), a small type/label line (warm/cold via
  `legend.warmCurrent/coldCurrent`; volcano via `legend.volcano`; commodity via
  `panel.majorProducer` + country name), then the `useWikiSummary` extracts rendered exactly
  like the country extracts (thumbnail + text + read-more link), with loading/error states.

### CountryLayerFacts (new)
- Props: `iso2`, `bounds`, `activeOverlayIds`.
- Loads `/data/agriculture.json` and `/data/volcanoes.geojson` via `useGeoData`
  (unconditional; cached). Renders conditionally on `activeOverlayIds`:
  - agriculture → `panel.agricultureProducts` + commodity icons/names from
    `commoditiesForCountry(agData, iso2)` mapped through `COMMODITIES`.
  - tectonic → `panel.volcanoes` + `volcanoCountInBounds(volcanoData, bounds)`.
  - climate → `panel.climateNote`. currents → `panel.currentsNote`.
- Returns `null` if no active overlay produces a line. Titled with `panel.layerDetails`.

## Pure helpers (`src/lib/`, unit-tested)
```
featureWikiTitles(feature, countryName) -> { vi: string[], en: string[] }
commoditiesForCountry(agData, iso2)     -> string[]   // commodity ids present for iso2
volcanoCountInBounds(volcanoData, bounds) -> number   // points with lng in [west,east], lat in [south,north]
```

## Layer component changes
- `PoliticalLayer`: click handler adds `kind:'country'` + `bounds` (`layer.getBounds()`).
- `CurrentsLayer`: `onEachFeature` adds `click` → `setSelected({kind:'current', nameVi, nameEn, type})`. Uses `useSelection()`.
- `TectonicLayer`: volcano `onEachFeature` adds `click` → `setSelected({kind:'volcano', name})`. Uses `useSelection()`.
- `AgricultureLayer`: each `Marker` gets `eventHandlers={{ click: () => setSelected({kind:'commodity', id, vi, en, icon, iso2}) }}`. Uses `useSelection()`.

## i18n (added to both vi.json and en.json)
- `panel.layerDetails` — ("Thông tin theo lớp" / "Layer details")
- `panel.agricultureProducts` — ("Nông sản chính" / "Major agricultural products")
- `panel.volcanoes` — ("Số núi lửa" / "Volcanoes")
- `panel.climateNote` — ("Xem các đới khí hậu trên bản đồ." / "See climate zones on the map.")
- `panel.currentsNote` — ("Xem các dòng biển trên bản đồ." / "See ocean currents on the map.")
- `panel.majorProducer` — ("Nước sản xuất chính" / "Major producer")
Feature warm/cold/volcano labels reuse `legend.warmCurrent`/`legend.coldCurrent`/`legend.volcano`.

## Error handling & edge cases
- Antimeridian-crossing countries (Russia, Fiji, USA) yield loose bounds → volcano count is
  approximate (documented in a code comment).
- Wikipedia article missing in the active language → English fallback; if none anywhere, the
  feature panel shows `panel.noData` (no crash).
- Commodity country unresolved → general commodity article only.
- `activeOverlayIds` defaults to an empty Set → InfoPanel without the prop (existing tests)
  renders no facts section, preserving current behavior.

## Testing
- Unit: `featureWikiTitles` (volcano/current/commodity, with and without countryName),
  `commoditiesForCountry` (several / none / dedupe), `volcanoCountInBounds` (in/out/empty).
- Unit (hook): `useWikiSummary` — picks first matching candidate; English fallback when vi
  missing; inert on null (mocked fetch).
- Component: InfoPanel renders a current feature view with a fetched extract (mocked);
  renders the country facts section (agriculture products + volcano count) with mocked data
  + active overlays; renders nothing extra when no overlays active.
- Full suite stays green (current 37 + new).

## Success criteria
- Clicking the coffee marker on India shows the "Coffee production in India" Wikipedia
  extract (English fallback if needed); clicking a volcano shows its article; clicking a
  current shows its article.
- Clicking a country with overlays active shows a "Layer details" section (agricultural
  products / volcano count / climate / currents notes per active overlay).
- Language switching (VI/EN/Dual) applies to all new panel text; feature extracts follow the
  language with English fallback.
- Tests green; `npm run build` clean.

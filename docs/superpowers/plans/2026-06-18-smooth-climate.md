# Smooth Climate Borders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smooth the blocky 0.5° climate-zone polygons at data-prep time so the shipped `climate.geojson` renders with natural, curved borders.

**Architecture:** In `scripts/fetch-data.mjs`, run each climate feature through Turf `simplify` (de-staircase + control size) then `polygonSmooth` (Chaikin corner-cutting), recombining the smoothed parts into one MultiPolygon and keeping `{ CODE }`. Turf is a build-time devDependency only; `ClimateLayer` is unchanged.

**Tech Stack:** Node build script, `@turf/simplify`, `@turf/polygon-smooth`.

**Reference spec:** `docs/superpowers/specs/2026-06-18-smooth-climate-design.md`

**Baseline:** branch `feature/smooth-climate` (off `master`), 64 tests passing.

---

## Task 1: Smooth climate polygons in the data script

**Files:** Modify `scripts/fetch-data.mjs`, `package.json`/`package-lock.json` (devDeps); regenerate `public/data/climate.geojson`.

- [ ] **Step 1: Install Turf build-time deps**
```bash
npm install -D @turf/simplify @turf/polygon-smooth
```

- [ ] **Step 2: Edit `scripts/fetch-data.mjs`.**
  - Add imports at the top (after the existing `node:fs/promises` import):
```js
import simplify from '@turf/simplify';
import polygonSmooth from '@turf/polygon-smooth';
```
  - Add a smoothing helper (place it just above the existing `trimClimate` function):
```js
// Smooth a blocky 0.5°-grid climate feature: simplify the staircase, then round corners
// (Chaikin via polygonSmooth). polygonSmooth splits MultiPolygons into multiple Polygon
// features, so recombine them into one MultiPolygon. Fall back to the raw geometry on error.
function smoothClimateFeature(f) {
  const code = f.properties?.CODE ?? null;
  try {
    const simplified = simplify(
      { type: 'Feature', properties: {}, geometry: f.geometry },
      { tolerance: 0.2, highQuality: true, mutate: false }
    );
    const fc = polygonSmooth(simplified, { iterations: 2 });
    const coords = [];
    for (const ft of fc.features) {
      const g = ft.geometry;
      if (g.type === 'Polygon') coords.push(g.coordinates);
      else if (g.type === 'MultiPolygon') coords.push(...g.coordinates);
    }
    if (coords.length === 0) throw new Error('no smoothed geometry');
    return { type: 'Feature', properties: { CODE: code }, geometry: { type: 'MultiPolygon', coordinates: coords } };
  } catch {
    return { type: 'Feature', properties: { CODE: code }, geometry: f.geometry };
  }
}
```
  - Replace the existing `trimClimate` function body so it maps through the smoother:
```js
function trimClimate(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map(smoothClimateFeature),
  };
}
```

- [ ] **Step 3: Regenerate the data** (re-downloads all sources; smoothing 2,259 polygons may take a little longer):
```bash
node scripts/fetch-data.mjs
```
Expected: prints the "Wrote countries, plates, volcanoes, climate" success line.

- [ ] **Step 4: Verify output** (ESM project — use readFileSync):
```bash
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('./public/data/climate.geojson','utf8'));const withCode=d.features.filter(f=>f.properties.CODE!=null).length;const types=[...new Set(d.features.map(f=>f.geometry.type))];console.log('features:',d.features.length,'withCODE:',withCode,'geomTypes:',types);"
node -e "const fs=require('fs');console.log('climate.geojson MB:',(fs.statSync('./public/data/climate.geojson').size/1048576).toFixed(2));"
```
Expected: feature count ≈ 2,259 (no zones lost), every feature has `CODE`, geometry types are Polygon/MultiPolygon. Report the size.
- If the size is **> ~2.5 MB**, reduce smoothing cost: change `iterations: 2` → `1` (or raise `tolerance` to `0.3`), re-run Step 3, re-check. Aim for ≲ ~2 MB. Report the value you settled on.

- [ ] **Step 5: Confirm the app still builds + tests pass**
```bash
npm run build
npm run test
```
Expected: build clean; 64 tests pass (no `src/` changes, so no regressions).

- [ ] **Step 6: Commit**
```bash
git add scripts/fetch-data.mjs package.json package-lock.json public/data/climate.geojson
git commit -m "feat: smooth climate-zone borders at data-prep time"
```

Then self-review and report: Status, the verification output (feature count, withCODE, geom types, file size, final tolerance/iterations used), build + test results, files changed, commit SHA, concerns (e.g. how many features hit the fallback, if detectable).

---

## Task 2: Final verification (browser)

- [ ] **Step 1:** `npm run test` (64) + `npm run build` (success).
- [ ] **Step 2:** Manual browser check (`npm run dev`): enable the Climate layer and confirm zone borders are smooth curves (not square steps); zones still colored by Köppen class; hover/click highlight + zoom still work. Look for faint hairline gaps between adjacent zones.
- [ ] **Step 3 (only if hairline slivers are visible):** in `src/components/layers/ClimateLayer.jsx` `style`, change `weight: 0` → `weight: 0.5` and set `color` to the same fill color (e.g. `color: climateClass(f.properties.CODE).color`) so each polygon's thin stroke masks the gaps. Re-verify, then commit that tweak separately. If no slivers, leave `ClimateLayer` unchanged.

---

## Self-review notes (addressed)
- **Spec coverage:** offline simplify+Chaikin smoothing in fetch-data (T1), devDeps build-only (T1 S1), size control via tolerance/iterations + report (T1 S4), feature-count/CODE preservation (T1 S4 check + 1:1 map), sliver check + optional mask (T2). All spec points mapped.
- **MultiPolygon correctness:** polygonSmooth splits MultiPolygons into multiple Polygon features; the helper recombines ALL output features into one MultiPolygon (no zone parts dropped) — addressed explicitly in `smoothClimateFeature`.
- **Type consistency:** `smoothClimateFeature` returns `{ type:'Feature', properties:{CODE}, geometry }`, same shape `trimClimate` produced before; `ClimateLayer` reads `feature.properties.CODE` (unchanged).
- **Placeholder scan:** none.

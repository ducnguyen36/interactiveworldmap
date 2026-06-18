import { writeFile, mkdir } from 'node:fs/promises';
import simplify from '@turf/simplify';
import polygonSmooth from '@turf/polygon-smooth';

const OUT = new URL('../public/data/', import.meta.url);

const COUNTRIES = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const PLATES = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json';
// Natural Earth does not publish a volcanoes GeoJSON; use the GVP (Global Volcanism Program)
// dataset mirrored via TidyTuesday (source: Smithsonian Institution GVP, CC0).
const VOLCANOES_CSV = 'https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2020/2020-05-12/volcano.csv';
const CLIMATE = 'https://raw.githubusercontent.com/circleofconfusion/climate-map/master/topojson/1976-2000.geojson';

const KEEP = ['NAME_VI', 'NAME_EN', 'NAME_LONG', 'WIKIDATAID', 'ISO_A2', 'ISO_A3', 'CONTINENT', 'POP_EST', 'LABELRANK', 'MAPCOLOR7'];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

function trimCountries(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      const props = {};
      for (const k of KEEP) if (k in f.properties) props[k] = f.properties[k];
      return { type: 'Feature', properties: props, geometry: f.geometry };
    }),
  };
}

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

function trimClimate(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map(smoothClimateFeature),
  };
}

/**
 * Parse the GVP volcano CSV (TidyTuesday mirror) into a GeoJSON FeatureCollection.
 * Columns: volcano_number,volcano_name,...,latitude,longitude,...
 */
function csvToVolcanoesGeoJSON(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const nameIdx = headers.indexOf('volcano_name');
  const latIdx = headers.indexOf('latitude');
  const lngIdx = headers.indexOf('longitude');

  const features = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const name = row[nameIdx] ? row[nameIdx].replace(/^"|"$/g, '') : null;
    const lat = parseFloat(row[latIdx]);
    const lng = parseFloat(row[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;
    features.push({
      type: 'Feature',
      properties: { name: name ?? null },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    });
  }
  return { type: 'FeatureCollection', features };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const [countries, plates, volcanoCSV, climate] = await Promise.all([
    getJson(COUNTRIES), getJson(PLATES), getText(VOLCANOES_CSV), getJson(CLIMATE),
  ]);
  await writeFile(new URL('countries.geojson', OUT), JSON.stringify(trimCountries(countries)));
  await writeFile(new URL('plates.geojson', OUT), JSON.stringify(plates));
  await writeFile(new URL('volcanoes.geojson', OUT), JSON.stringify(csvToVolcanoesGeoJSON(volcanoCSV)));
  await writeFile(new URL('climate.geojson', OUT), JSON.stringify(trimClimate(climate)));
  console.log('Wrote countries, plates, volcanoes, climate to public/data/');
}

main().catch((e) => { console.error(e); process.exit(1); });

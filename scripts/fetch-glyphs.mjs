import { writeFile, mkdir } from 'node:fs/promises';

// MapLibre symbol layers need pre-rendered SDF glyphs. Noto Sans covers Latin +
// Vietnamese; ranges are 256-codepoint blocks (7680-7935 = Latin Extended
// Additional, where precomposed Vietnamese lives). Source: openmaptiles/fonts (OFL).
//
// NOTE: plain "Noto Sans Regular" no longer exists in that repo/CDN — the font
// server 200s with an HTML redirect page at that path instead of 404ing, so a
// naive `res.ok` check is fooled into "successfully" saving a web page as a
// .pbf. The closest available Noto-Sans-derived regular weight is "Klokantech
// Noto Sans Regular" (the font OpenMapTiles' own default styles use), confirmed
// via the repo's gh-pages directory listing and verified below to serve real
// binary glyph data for every requested range.
const FONT = 'Klokantech Noto Sans Regular';
const RANGES = ['0-255', '256-511', '512-767', '768-1023', '7680-7935'];
const SOURCES = [
  (font, range) => `https://fonts.openmaptiles.org/${encodeURIComponent(font)}/${range}.pbf`,
  (font, range) => `https://raw.githubusercontent.com/openmaptiles/fonts/gh-pages/${encodeURIComponent(font)}/${range}.pbf`,
];

const OUT = new URL(`../public/glyphs/${FONT}/`, import.meta.url);

function looksLikeHtml(buf, contentType) {
  if (contentType && contentType.includes('html')) return true;
  const head = buf.subarray(0, 15).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

async function fetchFirst(range) {
  for (const src of SOURCES) {
    const url = src(FONT, range);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // A plain res.ok/length check isn't enough: some CDNs 200 an HTML
        // redirect/landing page for a missing path instead of 404ing.
        if (buf.length > 500 && !looksLikeHtml(buf, res.headers.get('content-type'))) {
          return { buf, url };
        }
      }
    } catch { /* try next source */ }
  }
  throw new Error(`No source served real glyph binary for range ${range}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const range of RANGES) {
    const { buf, url } = await fetchFirst(range);
    await writeFile(new URL(`${range}.pbf`, OUT), buf);
    console.log(`glyphs ${range}: ${buf.length} bytes (${url})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

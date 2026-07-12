import { mapColor } from './mapColor.js';
import { climateClass } from './climate.js';

// MapLibre data-driven color expressions built from the app's palette helpers,
// keeping a single source of truth for layer colors.

export function mapcolor7Expression() {
  const e = ['match', ['get', 'MAPCOLOR7']];
  for (const n of [1, 2, 3, 4, 5, 6, 7]) e.push(n, mapColor(n));
  e.push(mapColor(0));
  return e;
}

export function climateColorExpression() {
  const e = ['match', ['slice', ['coalesce', ['get', 'CODE'], ''], 0, 1]];
  for (const g of ['A', 'B', 'C', 'D', 'E']) e.push(g, climateClass(g).color);
  e.push(climateClass('?').color);
  return e;
}

export function currentColorExpression(warm, cold) {
  return ['match', ['get', 'type'], 'warm', warm, cold];
}

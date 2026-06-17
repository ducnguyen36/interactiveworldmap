// Natural Earth MAPCOLOR7 (1..7, adjacent countries differ) → vibrant palette.
const PALETTE = {
  1: '#e57373', 2: '#81c784', 3: '#64b5f6', 4: '#ffb74d',
  5: '#ba68c8', 6: '#4db6ac', 7: '#fff176',
};

export function mapColor(n) {
  return PALETTE[n] || '#cfd8dc';
}

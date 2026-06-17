// Köppen-Geiger main classes → fixed palette (theme-independent so the
// classification stays recognizable in both light and dark mode).
const GROUPS = {
  A: '#2e7d32', // tropical
  B: '#e0c060', // arid
  C: '#9ccc65', // temperate
  D: '#80cbc4', // continental
  E: '#cfd8dc', // polar
};

export function climateClass(code) {
  const g = typeof code === 'string' && code.length ? code[0].toUpperCase() : '';
  if (GROUPS[g]) return { group: g, color: GROUPS[g] };
  return { group: '?', color: '#cccccc' };
}

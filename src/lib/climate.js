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

// Köppen code → Wikipedia article candidates for the climate *type*.
// Returns { en: [...], vi: [...] }, specific title first then the general fallback.
export function koppenArticle(code) {
  const c = typeof code === 'string' ? code : '';
  const generalEn = 'Köppen climate classification';
  const generalVi = 'Phân loại khí hậu Köppen';
  let en = null;
  let vi = null;
  if (c === 'Af') { en = 'Tropical rainforest climate'; vi = 'Khí hậu rừng mưa nhiệt đới'; }
  else if (c === 'Am') { en = 'Tropical monsoon climate'; vi = 'Khí hậu gió mùa nhiệt đới'; }
  else if (c[0] === 'A') { en = 'Tropical savanna climate'; vi = 'Khí hậu xavan'; }
  else if (c.startsWith('BW')) { en = 'Desert climate'; vi = 'Khí hậu hoang mạc'; }
  else if (c.startsWith('BS')) { en = 'Semi-arid climate'; vi = 'Khí hậu bán khô hạn'; }
  else if (c.startsWith('Cs')) { en = 'Mediterranean climate'; vi = 'Khí hậu Địa Trung Hải'; }
  else if (c === 'Cfa' || c === 'Cwa') { en = 'Humid subtropical climate'; vi = 'Khí hậu cận nhiệt đới ẩm'; }
  else if (c[0] === 'C') { en = 'Oceanic climate'; vi = 'Khí hậu đại dương'; }
  else if (c[0] === 'D' && (c[2] === 'a' || c[2] === 'b')) { en = 'Humid continental climate'; vi = 'Khí hậu lục địa ẩm'; }
  else if (c[0] === 'D') { en = 'Subarctic climate'; vi = 'Khí hậu cận Bắc Cực'; }
  else if (c === 'ET') { en = 'Tundra'; vi = 'Đồng rêu'; }
  else if (c === 'EF') { en = 'Ice cap climate'; vi = 'Khí hậu chỏm băng'; }
  return {
    en: en ? [en, generalEn] : [generalEn],
    vi: vi ? [vi, generalVi] : [generalVi],
  };
}

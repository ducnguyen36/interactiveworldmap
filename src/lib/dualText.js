export function dualText(vi, en, mode) {
  if (mode === 'en') return en || vi || '';
  if (mode === 'dual') {
    if (!vi) return en || '';
    if (!en || en === vi) return vi;
    return `${vi} / ${en}`;
  }
  return vi || en || '';
}

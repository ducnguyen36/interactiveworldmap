// Build ordered Wikipedia title candidates (first match wins) per language for a
// non-country feature selection. countryName is { vi, en } or null.
export function featureWikiTitles(feature, countryName) {
  if (feature.kind === 'volcano') {
    return { vi: [feature.name], en: [feature.name] };
  }
  if (feature.kind === 'current') {
    return { vi: [feature.nameVi], en: [feature.nameEn] };
  }
  // commodity
  const en = countryName
    ? [`${feature.en} production in ${countryName.en}`, feature.en]
    : [feature.en];
  return { vi: [feature.vi], en };
}

export function climateTitles(nameVi, nameEn) {
  return {
    vi: [`Khí hậu ${nameVi}`, `Khí hậu của ${nameVi}`],
    en: [`Climate of ${nameEn}`],
  };
}

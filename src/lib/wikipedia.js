export function summaryUrl(lang, title) {
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
}

export function parseSummary(json) {
  if (!json || json.type?.endsWith('not_found')) return null;
  return {
    title: json.title ?? null,
    extract: json.extract ?? '',
    thumbnail: json.thumbnail?.source ?? null,
  };
}

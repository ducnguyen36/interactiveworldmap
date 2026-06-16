export function entitiesUrl(ids, languages = ['vi', 'en']) {
  const idParam = Array.isArray(ids) ? ids.join('|') : ids;
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: idParam,
    props: 'labels|claims|sitelinks',
    languages: languages.join('|'),
    sitefilter: languages.map((l) => `${l}wiki`).join('|'),
    format: 'json',
  });
  // Explicitly encode '*' as '%2A' — URLSearchParams leaves '*' unencoded
  return `https://www.wikidata.org/w/api.php?${params.toString()}&origin=%2A`;
}

export function getEntity(json, id) {
  return json?.entities?.[id] ?? null;
}

export function claimEntityId(entity, prop) {
  return entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
}

export function claimQuantity(entity, prop) {
  const amount = entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.amount;
  if (amount == null) return null;
  return Number(String(amount).replace('+', ''));
}

export function label(entity, lang) {
  return entity?.labels?.[lang]?.value ?? null;
}

export function siteTitle(entity, lang) {
  return entity?.sitelinks?.[`${lang}wiki`]?.title ?? null;
}

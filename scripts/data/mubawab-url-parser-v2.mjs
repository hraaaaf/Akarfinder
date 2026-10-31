export function decodePath(url) {
  try { return decodeURIComponent(new URL(url).pathname); } catch { return ''; }
}

export function normalizeAscii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseMubawabRoute(url) {
  const path = decodePath(url);
  const m = path.match(/^\/(?:fr|en|ar|es|it|nl)\/(a|pa)\/(\d+)(?:\/(.*))?$/i);
  if (!m) return null;
  return {
    kind: m[1].toLowerCase(),
    id: m[2],
    identity: `${m[1].toLowerCase()}:${m[2]}`,
    slug: m[3] || '',
  };
}

export function inferTransactionFromSlug(value) {
  const n = normalizeAscii(value);
  const sale = /(?:^|-)(?:for-sale|to-buy|a-vendre|en-vente|vente)(?:-|$)/.test(n);
  const rent = /(?:^|-)(?:for-rent|rental|a-louer|en-location|location)(?:-|$)/.test(n);
  if (sale && !rent) return 'sale';
  if (rent && !sale) return 'rent';
  if (sale && rent) return 'conflict';
  return null;
}

const TYPE_PATTERNS = [
  ['apartment', /(?:^|-)(?:apartment|apartments|appartement|appartements)(?:-|$)/],
  ['villa', /(?:^|-)(?:villa|villas)(?:-|$)/],
  ['house', /(?:^|-)(?:house|houses|maison|maisons)(?:-|$)/],
  ['office', /(?:^|-)(?:office|offices|bureau|bureaux)(?:-|$)/],
  ['commercial', /(?:^|-)(?:shop|shops|commercial|commerce|magasin|magasins|local-commercial|locaux-commerciaux)(?:-|$)/],
  ['land', /(?:^|-)(?:land|lands|terrain|terrains|lot|lots)(?:-|$)/],
  ['riad', /(?:^|-)(?:riad|riads)(?:-|$)/],
  ['duplex', /(?:^|-)(?:duplex)(?:-|$)/],
  ['studio', /(?:^|-)(?:studio|studios)(?:-|$)/],
  ['farm', /(?:^|-)(?:farm|farms|ferme|fermes)(?:-|$)/],
];

export function inferPropertyTypesFromSlug(value) {
  const n = normalizeAscii(value);
  return TYPE_PATTERNS.filter(([, re]) => re.test(n)).map(([type]) => type);
}

export function inferSurfaceEvidenceFromSlug(value) {
  const decoded = String(value ?? '').replace(/-/g, ' ');
  const re = /(?<!\d)(\d{1,3}(?:[ .]\d{3})*|\d{1,6})(?:[.,](\d+))?\s*(?:m²|m2|sqm)(?=\s|$)/giu;
  const candidates = [];
  for (const m of decoded.matchAll(re)) {
    let raw = m[1].replace(/[ .]/g, '');
    if (m[2]) raw += `.${m[2]}`;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 5 || numeric > 100000) continue;
    const before = decoded.slice(Math.max(0, m.index - 45), m.index).toLowerCase();
    const strong = /(?:surface|superficie|area|living area|total area|terrain|parcelle)\s*(?:de|of|totale|total|area)?\s*$/iu.test(before);
    candidates.push({
      value: numeric,
      confidence: strong ? 'high' : 'review',
      evidence: `slug:${m[0]}`,
    });
  }
  return candidates;
}

const CITY_TOKENS = [
  'casablanca','rabat','marrakech','tanger','agadir','fes','kenitra','mohammedia',
  'temara','meknes','tetouan','oujda','el-jadida','nador','essaouira','bouskoura','bouznika','azrou',
];

export function inferCityReviewFromSlug(value) {
  const n = normalizeAscii(value);
  const hits = [];
  for (const city of CITY_TOKENS) {
    if (new RegExp(`(?:^|-)${city}(?:-|$)`).test(n)) hits.push(city);
  }
  return [...new Set(hits)];
}

export function consensus(values) {
  const unique = [...new Set(values.filter((v) => v !== null && v !== undefined && v !== '' && v !== 'conflict'))];
  const hadExplicitConflict = values.includes('conflict');
  if (hadExplicitConflict || unique.length > 1) return { state: 'conflict', values: unique };
  if (unique.length === 1) return { state: 'recoverable_from_url', value: unique[0] };
  return { state: 'unresolved' };
}

export function aggregateMubawabIdentity(urls) {
  const first = parseMubawabRoute(urls[0]);
  if (!first) throw new Error('Expected Mubawab detail URL');
  const tx = [];
  const types = [];
  const strongSurfaces = [];
  const allSurfaces = [];
  const cities = [];

  for (const url of urls) {
    const route = parseMubawabRoute(url);
    if (!route || route.identity !== first.identity) throw new Error('Mixed Mubawab identity group');
    const transaction = inferTransactionFromSlug(route.slug);
    if (transaction) tx.push(transaction);
    types.push(...inferPropertyTypesFromSlug(route.slug));
    for (const evidence of inferSurfaceEvidenceFromSlug(decodeURIComponent(url))) {
      allSurfaces.push(evidence.value);
      if (evidence.confidence === 'high') strongSurfaces.push(evidence.value);
    }
    cities.push(...inferCityReviewFromSlug(route.slug));
  }

  const txConsensus = consensus(tx);
  const propertyTypeConsensus = consensus(types);
  const surfaces = [...new Set(allSurfaces)];
  const highSurfaces = [...new Set(strongSurfaces)];
  let surface;
  if (surfaces.length === 0) surface = { state: 'unresolved' };
  else if (surfaces.length > 1) surface = { state: 'conflict', values: surfaces };
  else if (highSurfaces.length === 1) surface = { state: 'recoverable_from_url', value: surfaces[0], confidence: 'high' };
  else surface = { state: 'review', value: surfaces[0], confidence: 'review' };

  const cityValues = [...new Set(cities)];
  const city = cityValues.length === 0
    ? { state: 'unresolved' }
    : cityValues.length === 1
      ? { state: 'review', value: cityValues[0], confidence: 'review' }
      : { state: 'conflict', values: cityValues };

  return {
    identity: first.identity,
    route_kind: first.kind,
    source_id: first.id,
    transaction_type: txConsensus,
    property_type: propertyTypeConsensus,
    surface_m2: surface,
    city_slug_evidence: city,
  };
}

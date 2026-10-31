export function normalizeAscii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseSaroutRoute(url) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(url).pathname); } catch { return null; }
  const m = pathname.match(/^\/(ar|fr)\/annonce\/(\d+)\/([^/?#]+)\/?$/i);
  if (!m) return null;
  return {
    locale: m[1].toLowerCase(),
    id: m[2],
    identity: `annonce:${m[2]}`,
    slug: m[3].toLowerCase(),
  };
}

export function inferSaroutTransaction(slug) {
  const n = normalizeAscii(slug);
  const sale = /(?:^|-)(?:vendre|vente|a-vendre)(?:-|$)/.test(n);
  const rent = /(?:^|-)(?:louer|location|a-louer)(?:-|$)/.test(n);
  if (sale && !rent) return 'sale';
  if (rent && !sale) return 'rent';
  if (sale && rent) return 'conflict';
  return null;
}

const TYPE_PATTERNS = [
  ['apartment', /^(?:appartement|apartment)(?:-|$)/],
  ['villa', /^(?:villa)(?:-|$)/],
  ['house', /^(?:maison|house)(?:-|$)/],
  ['office', /^(?:bureau|office)(?:-|$)/],
  ['commercial', /^(?:local-commercial|commerce|magasin|commercial)(?:-|$)/],
  ['land', /^(?:terrain|land)(?:-|$)/],
  ['riad', /^(?:riad)(?:-|$)/],
  ['studio', /^(?:studio)(?:-|$)/],
  ['duplex', /^(?:duplex)(?:-|$)/],
  ['farm', /^(?:ferme|farm)(?:-|$)/],
];

export function inferSaroutPropertyTypes(slug) {
  const n = normalizeAscii(slug);
  return TYPE_PATTERNS.filter(([, re]) => re.test(n)).map(([type]) => type);
}

export function inferSaroutSurface(slug) {
  const n = normalizeAscii(slug);
  const values = [];
  for (const m of n.matchAll(/(?<!\d)(\d{1,6})-m(?:2)?(?:-|$)/g)) {
    const value = Number(m[1]);
    if (Number.isFinite(value) && value >= 5 && value <= 100000 && !values.includes(value)) values.push(value);
  }
  if (!values.length) return { state: 'unresolved' };
  if (values.length > 1) return { state: 'conflict', values };
  return {
    state: 'recoverable_from_url',
    value: values[0],
    confidence: 'high',
    evidence: 'sarout_slug_explicit_surface',
  };
}

const CITY_ALIASES = [
  ['Casablanca', ['casablanca']],
  ['Rabat', ['rabat']],
  ['Marrakech', ['marrakech']],
  ['Tanger', ['tanger']],
  ['Agadir', ['agadir']],
  ['Témara', ['temara', 'tmara']],
  ['Béni Mellal', ['beni-mellal', 'bni-mellal']],
  ['Mohammedia', ['mohammedia', 'mohammdia']],
  ['El Jadida', ['el-jadida']],
  ['Kénitra', ['kenitra', 'knitra']],
  ['Oujda', ['oujda']],
  ['Fès', ['fes', 'fs']],
  ['Meknès', ['meknes']],
  ['Tétouan', ['tetouan']],
  ['Essaouira', ['essaouira']],
  ['Nador', ['nador']],
  ['Assilah', ['assilah', 'asila']],
  ['Sidi Kacem', ['sidi-kacem', 'sidi-qacem']],
  ['Al Hoceïma', ['al-hoceima', 'hoceima']],
  ['Bouznika', ['bouznika']],
  ['Taza', ['taza']],
  ['Khouribga', ['khouribga']],
  ['Berkane', ['berkane']],
  ['Laâyoune', ['laayoune']],
  ['Dakhla', ['dakhla']],
  ['Mansouria', ['mansouria', 'el-mansouria']],
];

export function inferSaroutCity(slug) {
  const n = normalizeAscii(slug);
  const hits = [];
  for (const [city, aliases] of CITY_ALIASES) {
    if (aliases.some((alias) => new RegExp(`(?:^|-)${alias}(?:-|$)`).test(n))) hits.push(city);
  }
  const unique = [...new Set(hits)];
  if (!unique.length) return { state: 'unresolved' };
  if (unique.length > 1) return { state: 'conflict', values: unique };
  return {
    state: 'recoverable_from_url',
    value: unique[0],
    confidence: 'high',
    evidence: 'sarout_slug_city_alias',
  };
}

export function preferredSaroutUrl(urls) {
  const parsed = urls.map(parseSaroutRoute).filter(Boolean);
  if (!parsed.length) return null;
  const fr = parsed.find((row) => row.locale === 'fr');
  const chosen = fr || parsed[0];
  return `https://sarout.ma/${chosen.locale}/annonce/${chosen.id}/${chosen.slug}`;
}

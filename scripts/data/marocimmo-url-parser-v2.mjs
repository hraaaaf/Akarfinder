export function parseMarocImmoRoute(url) {
  let parts;
  try {
    parts = new URL(url).pathname.split('/').filter(Boolean).map((x) => decodeURIComponent(x).toLowerCase());
  } catch {
    return null;
  }
  if (parts.length !== 6 || parts[0] !== 'fr') return null;
  const [locale, transaction, propertyType, city, district, slug] = parts;
  if (!['vente', 'location'].includes(transaction)) return null;
  if (!propertyType || !city || !district || !slug) return null;
  return {
    locale,
    identity: url,
    transaction_type: transaction === 'vente' ? 'sale' : 'rent',
    property_type: normalizeMarocImmoPropertyType(propertyType),
    city,
    district,
    slug,
  };
}

export function normalizeMarocImmoPropertyType(value) {
  const n = String(value || '').trim().toLowerCase();
  const map = {
    appartement: 'apartment',
    villa: 'villa',
    bureau: 'office',
    commercial: 'commercial',
    terrain: 'land',
    maison: 'house',
    ferme: 'farm',
  };
  return map[n] || n || null;
}

export function titleTransactionEvidence(title) {
  const t = String(title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sale = /\b(?:a vendre|vente)\b/.test(t);
  const rent = /\b(?:a louer|location)\b/.test(t);
  if (sale && !rent) return 'sale';
  if (rent && !sale) return 'rent';
  if (sale && rent) return 'conflict';
  return null;
}

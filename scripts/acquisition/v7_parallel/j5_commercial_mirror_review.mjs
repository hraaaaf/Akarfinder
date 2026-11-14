/**
 * V7 J5 — review-only cross-portal commercial-offer correlation.
 *
 * Input observations are public rendered-page notes, NOT immutable original
 * HTTP bytes. The result NEVER authorizes ingestion or proves one real
 * property. Commercial references may be reused or stale.
 */
export const J5_OFFER_CORRELATION_SCHEMA = 'akar-v7-j5-commercial-correlation-v1';
const ALLOWED = new Set(['agenz.ma', 'mubawab.ma']);
const EXPECTED_KEYS = new Set([
  'source_domain', 'source_offer_id', 'source_url', 'commercial_reference',
  'observation_kind', 'price_mad', 'surface_m2', 'bedrooms', 'city',
  'district', 'description_surface_m2', 'detail_floor', 'description_floor'
]);
const REF = /^[A-Z]{2,6}-[A-Z]{1,4}-[0-9]{3,8}$/;
const SOURCE_ID = /^[0-9]{4,12}$/;
const MAX = 20;

export class J5CommercialReviewRejected extends Error {}

const text = (s) => typeof s === 'string' ? s.trim().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase() : '';
function strictId(value) {
  if (typeof value !== 'string' || !SOURCE_ID.test(value)) {
    throw new J5CommercialReviewRejected('SOURCE_ID_INVALID');
  }
  return value;
}
function validateUrl(domain, id, raw) {
  if (typeof raw !== 'string' || raw.length < 35 || raw.length > 2048) {
    throw new J5CommercialReviewRejected('SOURCE_URL_INVALID');
  }
  let url;
  try { url = new URL(raw); } catch {
    throw new J5CommercialReviewRejected('SOURCE_URL_INVALID');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    url.search || url.hash || ![domain,'www.'+domain].includes(url.hostname) ||
    /%2f|%5c|%00|%25|\\|\/\//i.test(url.pathname)) {
    throw new J5CommercialReviewRejected('SOURCE_URL_UNSAFE');
  }
  const pattern = domain==='agenz.ma'
    ? /^\/fr\/annonces\/immo-[a-z0-9-]+\/vente-appartements\/[a-z0-9-]+\/([0-9]{4,12})\/?$/
    : /^\/fr\/a\/([0-9]{5,12})(?:\/[^/?#]+)?\/?$/;
  const match = pattern.exec(url.pathname);
  if (!match || match[1] !== id) {
    throw new J5CommercialReviewRejected('SOURCE_URL_ID_CONTRADICTION');
  }
  return raw;
}
function numeric(n, field, low, high, optional = false) {
  if (n === null && optional) return null;
  if (!Number.isInteger(n) || n < low || n > high) {
    throw new J5CommercialReviewRejected('INVALID_'+field.toUpperCase());
  }
  return n;
}
function observation(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      Object.keys(x).length !== EXPECTED_KEYS.size ||
      Object.keys(x).some(k => !EXPECTED_KEYS.has(k))) {
    throw new J5CommercialReviewRejected('OBSERVATION_SCHEMA_INVALID');
  }
  if (!ALLOWED.has(x.source_domain)) {
    throw new J5CommercialReviewRejected('PORTAL_NOT_ELIGIBLE_FOR_REVIEW');
  }
  const id = strictId(x.source_offer_id);
  const url = validateUrl(x.source_domain, id, x.source_url);
  if (x.observation_kind !== 'public_rendered_detail_unattested' ||
      typeof x.commercial_reference !== 'string' ||
      !REF.test(x.commercial_reference) ||
      !['sale','saleh','rabat'].includes(text(x.city)) ||
      !text(x.district) || text(x.district).length > 100) {
    throw new J5CommercialReviewRejected('OBSERVATION_UNATTESTED_OR_INCOMPLETE');
  }
  return {
    ...x, source_url: url, source_offer_id: id,
    price_mad: numeric(x.price_mad,'price_mad',10000,1000000000),
    surface_m2: numeric(x.surface_m2,'surface_m2',10,10000),
    bedrooms: numeric(x.bedrooms,'bedrooms',0,30),
    description_surface_m2: numeric(x.description_surface_m2,'description_surface_m2',10,10000,true),
    detail_floor: numeric(x.detail_floor,'detail_floor',0,100,true),
    description_floor: numeric(x.description_floor,'description_floor',0,100,true)
  };
}
function internalConflicts(x) {
  const contradictions=[];
  if (x.description_surface_m2 !== null &&
      x.description_surface_m2 !== x.surface_m2) contradictions.push('surface_m2');
  if (x.detail_floor !== null && x.description_floor !== null &&
      x.detail_floor !== x.description_floor) contradictions.push('floor');
  return contradictions;
}

export function reviewJ5CommercialCopies(inputs) {
  if (!Array.isArray(inputs) || inputs.length > MAX) {
    throw new J5CommercialReviewRejected('BOUNDED_OBSERVATIONS_REQUIRED');
  }
  const rows=inputs.map(observation);
  const seen=new Set();
  for (const r of rows) {
    const key=r.source_domain+':'+r.source_offer_id;
    if (seen.has(key)) throw new J5CommercialReviewRejected('DUPLICATE_SOURCE_ID');
    seen.add(key);
  }
  const grouped=new Map();
  for (const r of rows) {
    const group=grouped.get(r.commercial_reference)||[];
    group.push(r); grouped.set(r.commercial_reference,group);
  }
  const comparisons=[];
  for (const ref of [...grouped.keys()].sort()) {
    const group=grouped.get(ref).sort((a,b) =>
      a.source_domain.localeCompare(b.source_domain) ||
      a.source_offer_id.localeCompare(b.source_offer_id));
    const fields=['price_mad','surface_m2','bedrooms','city','district'];
    const contradictions=Object.fromEntries(group.map(r=>[
      r.source_domain+':'+r.source_offer_id,internalConflicts(r)
    ]));
    const fields_match=group.length===2 && fields.every(field =>
      (field==='city' || field==='district'
        ? text(group[0][field])===text(group[1][field])
        : group[0][field]===group[1][field]));
    const two_portals=group.length===2 &&
      group[0].source_domain!==group[1].source_domain;
    comparisons.push({
      commercial_reference: ref,
      observations:group.map(r=>({
        source_domain:r.source_domain,source_offer_id:r.source_offer_id,
        source_url:r.source_url,
        claimed_price_mad:r.price_mad, claimed_surface_m2:r.surface_m2,
        claimed_bedrooms:r.bedrooms,
        intra_page_contradictions:contradictions[r.source_domain+':'+r.source_offer_id]
      })),
      status:two_portals && fields_match
        ? 'two_portal_commercial_offer_match_review_only'
        : group.length===1 ? 'single_portal_unpaired'
        : 'commercial_reference_collision_or_value_drift_review',
      same_commercial_reference_observed:two_portals,
      canonical_listing_identity_verified: false,
      original_html_of_both_sites_verified: false,
      same_physical_property_verified:false,
      independent_geography_verified:false,
      eligible_for_private_detail_staging:false,
      eligible_for_public_admission:false
    });
  }
  return {
    schema_version:J5_OFFER_CORRELATION_SCHEMA,
    observations:rows.length,
    commercial_references:comparisons.length,
    possible_commercial_mirror_pairs:comparisons.filter(
      x=>x.status==='two_portal_commercial_offer_match_review_only').length,
    comparisons,
    input_evidence_level:'rendered_semantic_detail_unattested',
    physical_uniqueness_verified:false,
    source_http_requests:0,
    db_reads:0,db_writes:0,
    private_detail_staging:false,
    public_admission:false
  };
}

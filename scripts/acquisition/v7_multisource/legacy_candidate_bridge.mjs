/**
 * Offline compatibility bridge over EXISTING, merged L8 source enumerators.
 * Takes their in-memory listingUrls results. It NEVER calls enumerate(),
 * fetch(), a DB writer or the public-listing ingestion path.
 * Output is a URL-only candidate queue: NOT V3 detail, NOT radar_candidates.
 */
import { agenzListingId } from '../agenz-source-first.mjs';
import { avitoListingId, isAvitoRealEstateListing } from '../avito-sitemap-enumerator.mjs';
import { saroutyListingId, isSaroutyRealEstateListing } from '../sarouty-sitemap-enumerator.mjs';
import { normalizeMubawabUrl, isRobotsSafeUrl } from '../mubawab-exhaustive-enumerator.mjs';
import { marocAnnoncesListingId } from '../marocannonces-source-first.mjs';

export const CANDIDATE_SCHEMA = 'akarfinder-v7-legacy-url-candidate-v1';
export const MAX_URLS_PER_REPORT = 1000;
export const REUSED_ENUMERATORS = Object.freeze({
  'agenz.ma': 'scripts/acquisition/agenz-source-first.mjs',
  'avito.ma': 'scripts/acquisition/avito-sitemap-enumerator.mjs',
  'sarouty.ma': 'scripts/acquisition/sarouty-property-sitemap-enumerator.mjs',
  'mubawab.ma': 'scripts/acquisition/mubawab-exhaustive-enumerator.mjs',
  'marocannonces.com': 'scripts/acquisition/marocannonces-source-first.mjs',
});

const SOURCE_HOSTS = Object.freeze({
  'agenz.ma': new Set(['agenz.ma']),
  'avito.ma': new Set(['avito.ma', 'www.avito.ma']),
  'sarouty.ma': new Set(['sarouty.ma', 'www.sarouty.ma']),
  'mubawab.ma': new Set(['mubawab.ma', 'www.mubawab.ma']),
  'marocannonces.com': new Set(['www.marocannonces.com']),
});

export class LegacyCandidateError extends Error {
  constructor(code) { super(code); this.name = 'LegacyCandidateError'; }
}

function validateDetail(source, raw) {
  if (!SOURCE_HOSTS[source]) throw new LegacyCandidateError('SOURCE_NOT_WIRED');
  if (typeof raw !== 'string' || raw.length > 2048 || raw.length < 20) {
    throw new LegacyCandidateError('URL_INVALID');
  }
  // WHATWG parser normalizes empty port and hostname case; enforce raw authority.
  const authority = /^https:\/\/([^/?#]+)(?:\/|$)/.exec(raw);
  if (!authority || !SOURCE_HOSTS[source].has(authority[1])) {
    throw new LegacyCandidateError('SOURCE_AUTHORITY_INVALID');
  }
  let url;
  try { url = new URL(raw); }
  catch { throw new LegacyCandidateError('URL_INVALID'); }
  if (url.username || url.password || url.hash || url.pathname.includes('//') ||
      /%(?:2f|5c|00|25)/i.test(url.pathname) || url.pathname.includes('\\')) {
    throw new LegacyCandidateError('URL_UNSAFE');
  }
  if (url.search && (
    source !== 'sarouty.ma' ||
    url.pathname !== '/property-details' ||
    [...url.searchParams.keys()].length !== 1 ||
    !url.searchParams.has('listing_id')
  )) {
    throw new LegacyCandidateError('QUERY_NOT_ALLOWED');
  }

  let id = null;
  if (source === 'agenz.ma') {
    id = agenzListingId(raw);
  } else if (source === 'avito.ma') {
    if (isAvitoRealEstateListing(raw)) id = avitoListingId(raw);
  } else if (source === 'sarouty.ma') {
    if (isSaroutyRealEstateListing(raw)) id = saroutyListingId(raw);
  } else if (source === 'mubawab.ma') {
    const match = url.pathname.match(/^\/fr\/(?:a|pa)\/(\d{5,})(?:\/|$)/i);
    if (match && normalizeMubawabUrl(raw) && isRobotsSafeUrl(raw)) id = match[1];
  } else if (source === 'marocannonces.com') {
    if (/^\/annonce\/\d+\/[^?#]+$/i.test(url.pathname)) id = marocAnnoncesListingId(raw);
  }
  if (!id || !/^\d{5,12}$/.test(id)) throw new LegacyCandidateError('DETAIL_ID_NOT_PROVEN');

  return {
    schema_version: CANDIDATE_SCHEMA,
    source_domain: source,
    source_offer_id: id,
    source_url: 'https://' + authority[1] + url.pathname + url.search,
    discovery_method: 'existing_l8_collector_result_offline',
    record_kind: 'url_candidate_only',
    detail_observed: false,
    editorial_published_at: null,
    rights_verified: false,
    source_currently_active: null,
    eligible_for_private_detail_staging: false,
    eligible_for_public_admission: false,
  };
}

/**
 * Only a successful, zero-write legacy report is accepted.
 * Fail completely on 403/429/hard-block, malformed identity or colliding IDs.
 */
export function adaptLegacyReport(source, report) {
  if (!SOURCE_HOSTS[source]) throw new LegacyCandidateError('SOURCE_NOT_WIRED');
  if (!report || typeof report !== 'object' || Array.isArray(report) ||
      report.zeroDbWrites !== true ||
      (report.stoppedEarly !== null && report.stoppedEarly !== undefined) ||
      !Array.isArray(report.listingUrls) ||
      report.listingUrls.length > MAX_URLS_PER_REPORT) {
    throw new LegacyCandidateError('UNSAFE_OR_INCOMPLETE_REPORT');
  }

  const byId = new Map();
  for (const inputUrl of report.listingUrls) {
    const row = validateDetail(source, inputUrl);
    const old = byId.get(row.source_offer_id);
    if (old && old.source_url !== row.source_url) {
      throw new LegacyCandidateError('SOURCE_ID_URL_COLLISION');
    }
    byId.set(row.source_offer_id, row);
  }
  return {
    source,
    input_urls: report.listingUrls.length,
    url_only_count: byId.size,
    network_requests_by_bridge: 0,
    db_writes_by_bridge: 0,
    private_detail_staging_count: 0,
    candidates: [...byId.values()].sort((a, b) =>
      a.source_offer_id.localeCompare(b.source_offer_id)),
  };
}

/** Aggregate without treating different portal IDs as physical uniqueness. */
export function adaptLegacyReports(reportsBySource) {
  if (!reportsBySource || typeof reportsBySource !== 'object' || Array.isArray(reportsBySource)) {
    throw new LegacyCandidateError('REPORTS_NOT_OBJECT');
  }
  const batch = [];
  const seen = new Set();
  for (const [source, report] of Object.entries(reportsBySource)) {
    const result = adaptLegacyReport(source, report);
    for (const row of result.candidates) {
      const key = source + '\0' + row.source_offer_id;
      if (seen.has(key)) throw new LegacyCandidateError('DUPLICATE_SOURCE_KEY');
      seen.add(key);
      batch.push(row);
    }
  }
  return {
    schema_version: CANDIDATE_SCHEMA,
    candidate_urls: batch.length,
    physical_unique_properties: null,
    detailed_records: 0,
    sources: [...new Set(batch.map(x => x.source_domain))].sort(),
    db_writes: 0,
    source_fetches_by_bridge: 0,
    eligible_for_private_detail_staging: 0,
    records: batch,
  };
}

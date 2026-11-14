/** J5 — remaining portal lanes, reuse merged L8 and expose unintegrated gaps.
 *
 * Lists / sitemap discovery are not full listing detail, mirror domains
 * cannot be added as unique properties without original origin ID.
 */
import {adaptLegacyReports, LegacyCandidateError} from '../v7_multisource/legacy_candidate_bridge.mjs';

export const J5_SCHEMA = 'akarfinder-v7-parallel-source-v1';
export const J5_PRIORITY = Object.freeze([
  'mubawab.ma', 'marocannonces.com', 'masaken.ma',
  'immoneuf.avito.ma', 'immo.mitula.ma', 'maportail-immobilier.ma'
]);
const MERGED = new Set(['mubawab.ma','marocannonces.com']);
const MIRRORS = new Set(['immoneuf.avito.ma','immo.mitula.ma']);
// The existing V7 intake has a 1,000-input bound for an entire batch, not per portal.
export const J5_MAX_RAW_URLS_PER_BATCH = 1000;

export function remainingPortalPlan() {
  return J5_PRIORITY.map((domain, i) => ({
    portal: domain,
    priority: i+1,
    status: MERGED.has(domain) ? 'merged_L8_candidate_validator_only' : 'not_integrated',
    risk: MIRRORS.has(domain) ? 'upstream_original_identity_required' : 'direct_page_evidence_required',
    live_enabled: false, private_detail_staging: false, public_admission: false,
  }));
}

export function assessJ5(reports = {}) {
  if (!reports || typeof reports !== 'object' || Array.isArray(reports)) {
    throw new LegacyCandidateError('J5_REPORTS_INVALID');
  }
  for (const source of Object.keys(reports)) {
    if (!MERGED.has(source)) throw new LegacyCandidateError('J5_SOURCE_NOT_INTEGRATED');
  }
  const accepted = adaptLegacyReports(reports);
  // The L8 bridge already validated the per-source list and URL/ID integrity.
  // Enforce the aggregate V7 input limit as well: 2 x 1,000 is NOT safe.
  const submitted = Object.values(reports).reduce((n, r) => n + r.listingUrls.length, 0);
  if (submitted > J5_MAX_RAW_URLS_PER_BATCH) {
    throw new LegacyCandidateError('J5_AGGREGATE_URL_LIMIT');
  }
  for (const item of accepted.records) {
    if (!MERGED.has(item.source_domain)) throw new LegacyCandidateError('J5_ADAPTER_SCOPE_BROKEN');
  }
  // Deterministic order independent of report-object insertion order.
  const ordered = [...accepted.records].sort((a, b) =>
    J5_PRIORITY.indexOf(a.source_domain) - J5_PRIORITY.indexOf(b.source_domain)
    || a.source_offer_id.localeCompare(b.source_offer_id));
  const uniqueBySource = Object.fromEntries(
    [...MERGED].map(domain => [domain, ordered.filter(x => x.source_domain === domain).length])
  );
  return {
    schema_version: J5_SCHEMA,
    inventory: remainingPortalPlan(),
    source_url_candidates: ordered.map(x => ({
      portal: x.source_domain, source_offer_id: x.source_offer_id,
      source_url: x.source_url, detailed_page_seen: false,
      source_freshness_verified: false, rights_verified: false,
      source_report_authenticated: false, original_html_sha256_verified: false,
      private_detail_staging: false, public_admission: false,
    })),
    unintegrated: J5_PRIORITY.filter(x => !MERGED.has(x)),
    candidates_count: ordered.length,
    raw_source_url_count: submitted,
    duplicate_raw_url_count: submitted - ordered.length,
    candidate_counts_by_source: uniqueBySource,
    detailed_listings: 0, physical_uniqueness_verified: false,
    source_network_requests: 0, db_writes: 0,
  };
}

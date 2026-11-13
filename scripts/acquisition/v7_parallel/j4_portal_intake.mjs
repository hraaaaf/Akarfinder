/** J4 — AVITO / SAROUTY merged L8 reuse + Yakeey draft-link quarantine.
 * All records are candidate URLs only; never a detailed V3 record.
 */
import { adaptLegacyReports, LegacyCandidateError } from '../v7_multisource/legacy_candidate_bridge.mjs';

export const J4_SCHEMA = 'akarfinder-v7-parallel-source-v1';
const TWO_MERGED = new Set(['avito.ma', 'sarouty.ma']);
const MAX_YAKEEY = 50;

export function reviewYakeeyDraftLinks(links) {
  if (!Array.isArray(links) || links.length > MAX_YAKEEY) throw new LegacyCandidateError('YAKEEY_BOUNDED_LIST_REQUIRED');
  const results = new Map();
  for (const raw of links) {
    if (typeof raw !== 'string' || raw.length > 2048 || raw.length < 21) {
      throw new LegacyCandidateError('YAKEEY_URL_INVALID');
    }
    let u;
    try { u = new URL(raw); }
    catch { throw new LegacyCandidateError('YAKEEY_URL_INVALID'); }
    const match = /^https:\/\/(www\.)?yakeey\.com\/[a-z0-9/_-]+\/?$/i.test(raw);
    if (!match || u.protocol !== 'https:' || !['www.yakeey.com','yakeey.com'].includes(u.hostname) ||
        u.username || u.password || u.search || u.hash || u.port || u.pathname === '/' || u.pathname.includes('//')) {
      throw new LegacyCandidateError('YAKEEY_SOURCE_NOT_VERIFIED');
    }
    results.set(raw, {
      schema_version: J4_SCHEMA, portal: 'yakeey.com', source_url: raw,
      original_listing_id: null, evidence_kind: 'third_party_draft_link_only',
      connector_merged: false, private_detail_staging: false,
      public_admission: false, source_network_requests: 0, db_writes: 0,
    });
  }
  return [...results.values()];
}

export function assessJ4({ mergedReports = {}, yakeeyDraftLinks = [] } = {}) {
  if (!mergedReports || typeof mergedReports !== 'object' || Array.isArray(mergedReports)) {
    throw new LegacyCandidateError('INVALID_J4_REPORTS');
  }
  for (const portal of Object.keys(mergedReports)) {
    if (!TWO_MERGED.has(portal)) throw new LegacyCandidateError('J4_SOURCE_NOT_WIRED');
  }
  const legacy = adaptLegacyReports(mergedReports);
  const yakeey = reviewYakeeyDraftLinks(yakeeyDraftLinks);
  return {
    schema_version: J4_SCHEMA,
    merged_url_only_candidates: legacy.records.map(x => ({
      schema_version: J4_SCHEMA,
      portal: x.source_domain, source_url: x.source_url,
      original_listing_id: x.source_offer_id,
      evidence_kind: 'merged_L8_url_only',
      private_detail_staging: false, public_admission: false,
    })),
    yakeey_draft_unverified_links: yakeey,
    detailed_records: 0,
    unique_physical_properties: null,
    source_network_requests: 0, db_writes: 0,
    missing_gates: ['per_source_real_html_proof', 'Yakeey_direct_collector_merged',
      'individual_page_field_validation', 'publication_freshness_evidence'],
  };
}

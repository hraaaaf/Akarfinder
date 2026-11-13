/** J4 — AVITO / SAROUTY merged L8 reuse + Yakeey draft-link quarantine.
 * All records are candidate URLs only; never a detailed V3 record.
 */
import { adaptLegacyReports, LegacyCandidateError } from '../v7_multisource/legacy_candidate_bridge.mjs';

export const J4_SCHEMA = 'akarfinder-v7-parallel-source-v1';
const TWO_MERGED = new Set(['avito.ma', 'sarouty.ma']);
const J4_SOURCE_ORDER = Object.freeze(['avito.ma', 'sarouty.ma']);
// Python V7 legacy_url_intake.inspect_url_only_candidates accepts <=1000 TOTAL.
export const J4_MAX_RAW_URLS_PER_BATCH = 1000;
const MAX_YAKEEY = 50;

/** Based on the exact historical #1146 Kaynly output shape (DRAFT).
 * /fr-ma/...-ca5003319 represents candidate source ID ca5003319, NOT a
 * verified original listing. No direct Yakeey collector is merged.
 */
function yakeeyDraftIdentity(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || raw.length < 30 ||
      !/^https:\/\/(?:www\.)?yakeey\.com\/fr-ma\/[a-z0-9-]+$/.test(raw)) {
    throw new LegacyCandidateError('YAKEEY_DETAIL_ROUTE_UNPROVEN');
  }
  let u;
  try { u = new URL(raw); }
  catch { throw new LegacyCandidateError('YAKEEY_URL_INVALID'); }
  if (u.protocol !== 'https:' || !['www.yakeey.com','yakeey.com'].includes(u.hostname) ||
      u.username || u.password || u.port || u.search || u.hash ||
      u.pathname.includes('//') || u.pathname.includes('%') || u.pathname.includes('\\')) {
    throw new LegacyCandidateError('YAKEEY_SOURCE_NOT_VERIFIED');
  }
  const match = /^\/fr-ma\/[a-z0-9-]+-([a-z]{2}\d{5,12})$/.exec(u.pathname);
  if (!match) throw new LegacyCandidateError('YAKEEY_SOURCE_ID_UNPROVEN');
  return match[1];
}

function yakeeyQuarantineRecord(raw, candidateId, sourceEvidence) {
  return {
    schema_version: J4_SCHEMA, portal: 'yakeey.com', source_url: raw,
    original_listing_id: null, candidate_source_offer_id_from_url: candidateId,
    evidence_kind: sourceEvidence, source_detail_observed: false,
    historical_collector_pr: 1146, collector_merged: false,
    private_detail_staging: false, public_admission: false,
    source_network_requests: 0, db_writes: 0,
  };
}

export function reviewYakeeyDraftLinks(links) {
  if (!Array.isArray(links) || links.length > MAX_YAKEEY)
    throw new LegacyCandidateError('YAKEEY_BOUNDED_LIST_REQUIRED');
  const results = new Map();
  const seenIds = new Map();
  for (const raw of links) {
    const id = yakeeyDraftIdentity(raw);
    if (seenIds.has(id) && seenIds.get(id) !== raw)
      throw new LegacyCandidateError('YAKEEY_CANDIDATE_ID_URL_COLLISION');
    seenIds.set(id,raw);
    results.set(raw, yakeeyQuarantineRecord(raw,id,'third_party_draft_link_only'));
  }
  return [...results.values()];
}

/** Direct reuse of #1146 source_links.jsonl records, not its network fetcher.
 * Historical record { id:"yakeey:ca5003319", platform:"yakeey",
 * url:"https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319",
 * detail_state:"not_fetched" }. No accepted "fetched" evidence.
 */
export function reviewKaynlyDraftRecords(records) {
  if (!Array.isArray(records) || records.length > MAX_YAKEEY)
    throw new LegacyCandidateError('YAKEEY_BOUNDED_RECORDS_REQUIRED');
  const out = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        Object.keys(record).sort().join('|') !== 'detail_state|id|platform|url' ||
        record.platform !== 'yakeey' || record.detail_state !== 'not_fetched') {
      throw new LegacyCandidateError('YAKEEY_HISTORICAL_RECORD_INVALID');
    }
    const candidateId = yakeeyDraftIdentity(record.url);
    if (record.id !== 'yakeey:' + candidateId) {
      throw new LegacyCandidateError('YAKEEY_HISTORICAL_ID_MISMATCH');
    }
    const old = out.get(candidateId);
    if (old && old.source_url !== record.url) {
      throw new LegacyCandidateError('YAKEEY_CANDIDATE_ID_URL_COLLISION');
    }
    out.set(candidateId, yakeeyQuarantineRecord(
      record.url,candidateId,'historical_kaynly_draft_source_link_only'));
  }
  return [...out.values()];
}

export function assessJ4({ mergedReports = {}, yakeeyDraftLinks = [], yakeeyDraftRecords = [] } = {}) {
  if (!mergedReports || typeof mergedReports !== 'object' || Array.isArray(mergedReports)) {
    throw new LegacyCandidateError('INVALID_J4_REPORTS');
  }
  for (const portal of Object.keys(mergedReports)) {
    if (!TWO_MERGED.has(portal)) throw new LegacyCandidateError('J4_SOURCE_NOT_WIRED');
  }
  const legacy = adaptLegacyReports(mergedReports);
  // Each merged L8 report allows 1000. The DOWNSTREAM V7 intake allows
  // 1000 in total; reject the raw aggregate, including duplicate URLs.
  const submitted = Object.values(mergedReports).reduce(
    (count, report) => count + report.listingUrls.length, 0);
  if (submitted > J4_MAX_RAW_URLS_PER_BATCH) {
    throw new LegacyCandidateError('J4_AGGREGATE_URL_LIMIT');
  }
  const mergedL8 = [...legacy.records].sort((a,b)=>
    J4_SOURCE_ORDER.indexOf(a.source_domain) - J4_SOURCE_ORDER.indexOf(b.source_domain)
    || a.source_offer_id.localeCompare(b.source_offer_id));
  const perSource = Object.fromEntries(J4_SOURCE_ORDER.map(domain=>
    [domain, mergedL8.filter(x=>x.source_domain===domain).length]));
  const yakeey = reviewYakeeyDraftLinks(yakeeyDraftLinks);
  const imported = reviewKaynlyDraftRecords(yakeeyDraftRecords);
  const merged = new Map();
  for (const candidate of [...yakeey,...imported]) {
    const key = candidate.candidate_source_offer_id_from_url;
    const old = merged.get(key);
    if (old && old.source_url !== candidate.source_url)
      throw new LegacyCandidateError('YAKEEY_CANDIDATE_ID_URL_COLLISION');
    // Do not create a new source identity for third-party duplicate links.
    if (!old) {
      merged.set(key, {
        ...candidate,
        evidence_sources: [candidate.evidence_kind],
      });
    } else if (!old.evidence_sources.includes(candidate.evidence_kind)) {
      old.evidence_sources.push(candidate.evidence_kind);
      old.evidence_sources.sort();
    }
  }
  if (merged.size > MAX_YAKEEY) {
    throw new LegacyCandidateError('YAKEEY_COMBINED_CANDIDATE_LIMIT');
  }
  return {
    schema_version: J4_SCHEMA,
    merged_url_only_candidates: mergedL8.map(x => ({
      schema_version: J4_SCHEMA,
      portal: x.source_domain, source_url: x.source_url,
      original_listing_id: x.source_offer_id,
      evidence_kind: 'merged_L8_url_only',
      source_report_authenticated: false, original_html_sha256_verified: false,
      private_detail_staging: false, public_admission: false,
    })),
    raw_merged_source_url_count: submitted,
    duplicate_raw_merged_url_count: submitted - mergedL8.length,
    merged_candidate_counts_by_source: perSource,
    // The Yakeey links below are a separate, NON-integrated quarantine lane,
    // and MUST NEVER be appended to the V7 1000-row L8 intake.
    yakeey_draft_unverified_links: [...merged.values()],
    detailed_records: 0,
    unique_physical_properties: null,
    source_network_requests: 0, db_writes: 0,
    missing_gates: ['per_source_real_html_proof', 'Yakeey_direct_collector_merged',
      'individual_page_field_validation', 'publication_freshness_evidence'],
  };
}

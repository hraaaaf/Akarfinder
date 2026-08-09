#!/usr/bin/env tsx
// P1B.8 — Geo Authority Evidence Review
// Read-only review of independent public-authority evidence for the exact
// 10 P1B.7 PRIORITY_EXTERNAL_VALIDATION city/district pairs.
// Commercial portals are never accepted as geographic authority.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { runP1B7GeoRegistryGapQualification } from "@/scripts/audits/p1b7-geo-registry-gap-qualification";

const MANIFEST_PATH = join(process.cwd(), "data/geo/p1b8-authority-evidence.json");
const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p1b8-geo-authority-evidence-review.json");

const ALLOWED_AUTHORITY_DOMAINS = new Set([
  "agadir.ma",
  "visitcasablanca.ma",
  "ville-marrakech.ma",
  "auc.ma",
  "tanger.ma",
  "aut.gov.ma",
]);

const PROPERTY_PORTAL_DOMAINS = new Set([
  "mouldar.com",
  "mubawab.ma",
  "marrakechrealty.com",
  "avito.ma",
  "agenz.ma",
]);

const EXPECTED_DECISIONS = {
  AUTHORITY_CONFIRMED_NEIGHBORHOOD: { pairs: 2, listing_rows: 8 },
  INSTITUTIONAL_NEIGHBORHOOD_CORROBORATION: { pairs: 1, listing_rows: 4 },
  INSTITUTIONAL_LOCALITY_MENTION_NEEDS_ADMIN_AUTHORITY: { pairs: 1, listing_rows: 3 },
  OFFICIAL_LOCALITY_TYPE_REVIEW: { pairs: 1, listing_rows: 4 },
  OFFICIAL_LANDMARK_TYPE_MISMATCH_REVIEW: { pairs: 1, listing_rows: 2 },
  OFFICIAL_NAME_MENTION_TYPE_UNRESOLVED: { pairs: 1, listing_rows: 2 },
  NO_NEIGHBORHOOD_AUTHORITY_EVIDENCE_FOUND_IN_REVIEW_SCOPE: { pairs: 3, listing_rows: 8 },
} as const;

type Evidence = {
  domain: string;
  url: string;
  authority_kind: string;
  claim_kind: string;
  summary: string;
};

type ManifestPair = {
  city: string;
  district: string;
  p1b7_rows: number;
  p1b7_source_domains: string[];
  authority_tier: "A" | "B" | "C" | "NONE";
  decision: keyof typeof EXPECTED_DECISIONS;
  observed_entity_type: string;
  evidence: Evidence[];
  reviewed_authorities?: string[];
  write_eligible_in_p1b8: boolean;
  next_action: string;
};

type Manifest = {
  schema_version: string;
  reviewed_at: string;
  input_contract: string;
  policy: Record<string, boolean>;
  authority_tiers: Record<string, string>;
  pairs: ManifestPair[];
};

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function domainFromUrl(value: string) {
  return normalizeDomain(new URL(value).hostname);
}

function pairKey(city: string, district: string) {
  return `${city}\u0000${district}`;
}

function sameStrings(a: string[], b: string[]) {
  const left = [...a].map(normalizeDomain).sort();
  const right = [...b].map(normalizeDomain).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function runP1B8GeoAuthorityEvidenceReview() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  assert(manifest.schema_version === "p1b8-geo-authority-evidence-v1", "unexpected P1B.8 manifest schema");
  assert(manifest.input_contract === "P1B.7 PRIORITY_EXTERNAL_VALIDATION exact 10-pair cohort", "unexpected P1B.8 input contract");

  for (const marker of [
    "read_only",
    "commercial_recurrence_is_not_geo_truth",
    "property_portals_are_not_authority",
    "absence_of_evidence_is_not_evidence_of_absence",
    "entity_type_must_be_explicitly_supported",
  ]) {
    assert(manifest.policy[marker] === true, `missing P1B.8 policy marker: ${marker}`);
  }
  for (const marker of ["db_mutation", "registry_mutation", "alias_creation", "entity_creation", "geo_resolution_write"]) {
    assert(manifest.policy[marker] === false, `unsafe P1B.8 mutation marker: ${marker}`);
  }

  const p1b7 = await runP1B7GeoRegistryGapQualification();
  const currentPriority = p1b7.rows.filter((row) => row.decision === "PRIORITY_EXTERNAL_VALIDATION");
  assert(currentPriority.length === 10, `P1B.7 priority cohort drifted: expected 10 pairs, got ${currentPriority.length}`);
  assert(currentPriority.reduce((sum, row) => sum + row.rows, 0) === 31, "P1B.7 priority listing-row cohort drifted from 31");

  assert(manifest.pairs.length === 10, `P1B.8 manifest must contain exactly 10 pairs, got ${manifest.pairs.length}`);
  assert(manifest.pairs.reduce((sum, pair) => sum + pair.p1b7_rows, 0) === 31, "P1B.8 manifest listing-row total must equal 31");

  const manifestKeys = new Set<string>();
  const currentByKey = new Map(currentPriority.map((row) => [pairKey(row.city, row.district), row] as const));

  for (const pair of manifest.pairs) {
    const key = pairKey(pair.city, pair.district);
    assert(!manifestKeys.has(key), `duplicate P1B.8 pair: ${pair.city} — ${pair.district}`);
    manifestKeys.add(key);

    const current = currentByKey.get(key);
    assert(current, `P1B.8 pair no longer belongs to current P1B.7 priority cohort: ${pair.city} — ${pair.district}`);
    assert(current.rows === pair.p1b7_rows, `P1B.8 row-count drift: ${pair.city} — ${pair.district}`);
    assert(sameStrings(current.source_domains, pair.p1b7_source_domains), `P1B.8 source-domain drift: ${pair.city} — ${pair.district}`);
    assert(pair.write_eligible_in_p1b8 === false, `P1B.8 may not authorize Registry write: ${pair.city} — ${pair.district}`);

    if (pair.authority_tier === "A") {
      assert(pair.decision === "AUTHORITY_CONFIRMED_NEIGHBORHOOD", `Tier A must be explicit neighborhood authority: ${pair.city} — ${pair.district}`);
      assert(pair.evidence.length >= 1, `Tier A requires positive authority evidence: ${pair.city} — ${pair.district}`);
    } else {
      assert(pair.decision !== "AUTHORITY_CONFIRMED_NEIGHBORHOOD", `Only Tier A can be authority-confirmed neighborhood: ${pair.city} — ${pair.district}`);
    }

    if (pair.authority_tier === "NONE") {
      assert(pair.evidence.length === 0, `NONE tier may not fabricate positive evidence: ${pair.city} — ${pair.district}`);
      assert((pair.reviewed_authorities?.length ?? 0) > 0, `NONE tier requires documented review scope: ${pair.city} — ${pair.district}`);
    }

    for (const evidence of pair.evidence) {
      const declaredDomain = normalizeDomain(evidence.domain);
      const actualDomain = domainFromUrl(evidence.url);
      assert(declaredDomain === actualDomain, `evidence URL/domain mismatch: ${pair.city} — ${pair.district}`);
      assert(ALLOWED_AUTHORITY_DOMAINS.has(declaredDomain), `unapproved authority domain: ${declaredDomain}`);
      assert(!PROPERTY_PORTAL_DOMAINS.has(declaredDomain), `property portal cannot be authority evidence: ${declaredDomain}`);
      assert(!pair.p1b7_source_domains.map(normalizeDomain).includes(declaredDomain), `commercial recurrence leaked into authority evidence: ${declaredDomain}`);
      assert(evidence.summary.length > 20, `authority evidence summary too weak: ${pair.city} — ${pair.district}`);
    }

    for (const reviewedDomain of pair.reviewed_authorities ?? []) {
      const domain = normalizeDomain(reviewedDomain);
      assert(ALLOWED_AUTHORITY_DOMAINS.has(domain), `unapproved reviewed authority domain: ${domain}`);
      assert(!PROPERTY_PORTAL_DOMAINS.has(domain), `property portal cannot define negative review scope: ${domain}`);
    }
  }

  for (const current of currentPriority) {
    assert(manifestKeys.has(pairKey(current.city, current.district)), `current P1B.7 priority pair missing from P1B.8 manifest: ${current.city} — ${current.district}`);
  }

  const decisionCounts = Object.fromEntries(
    Object.keys(EXPECTED_DECISIONS).map((decision) => {
      const rows = manifest.pairs.filter((pair) => pair.decision === decision);
      return [decision, { pairs: rows.length, listing_rows: rows.reduce((sum, row) => sum + row.p1b7_rows, 0) }];
    }),
  ) as Record<string, { pairs: number; listing_rows: number }>;

  for (const [decision, expected] of Object.entries(EXPECTED_DECISIONS)) {
    const actual = decisionCounts[decision];
    assert(actual.pairs === expected.pairs && actual.listing_rows === expected.listing_rows, `P1B.8 decision drift for ${decision}`);
  }

  const confirmed = manifest.pairs.filter((pair) => pair.decision === "AUTHORITY_CONFIRMED_NEIGHBORHOOD");
  const report = {
    schema_version: "p1b8-geo-authority-evidence-review-v1",
    generated_at: new Date().toISOString(),
    reviewed_at: manifest.reviewed_at,
    contract: {
      read_only: true,
      db_mutation: false,
      registry_mutation: false,
      alias_creation: false,
      entity_creation: false,
      geo_resolution_write: false,
      property_portals_are_not_authority: true,
      commercial_recurrence_is_not_geo_truth: true,
      absence_of_evidence_is_not_evidence_of_absence: true,
    },
    p1b7_priority_baseline: {
      pairs: currentPriority.length,
      listing_rows: currentPriority.reduce((sum, row) => sum + row.rows, 0),
    },
    decision_counts: decisionCounts,
    authority_confirmed_neighborhoods: confirmed.map((pair) => ({ city: pair.city, district: pair.district, listing_rows: pair.p1b7_rows })),
    authority_confirmed_neighborhood_pairs: confirmed.length,
    registry_write_authorized_pairs: 0,
    verdict: "AUTHORITY_EVIDENCE_REVIEW_COMPLETE_NO_REGISTRY_WRITE_AUTHORIZED",
    next_boundary: "A separate bounded Registry candidate review may consider only Tier A pairs; P1B.8 itself authorizes no mutation.",
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  runP1B8GeoAuthorityEvidenceReview().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}

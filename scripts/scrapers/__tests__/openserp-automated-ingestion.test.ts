import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  isOpenSerpAutomatedIngestionEnabled,
  isOpenSerpIngestionWriteEnabled,
  isOpenSerpIngestionCronEnabled,
  isOpenSerpIngestionWriteAuthorized,
  isOpenSerpIngestionCronAuthorized,
} from "../../../lib/openserp-ingestion/openserp-ingestion-feature-flags.js";
import {
  loadSourceDomainRegistry,
  getDomainStatus,
  isDomainAdmissible,
  isDomainExternalWebResult,
} from "../../../lib/openserp-ingestion/domain-registry.js";
import { sanitizePriceMad, IMPLAUSIBLE_PRICE_CEILING_MAD } from "../../../lib/openserp-ingestion/national-writer.js";
import {
  TIER_1_CITIES,
  TIER_3_DISTRICTS,
  getCityTier,
  isRecognizedCity,
} from "../../../lib/openserp-ingestion/national-geography.js";
import { extractCityNational, extractDistrictNational } from "../../../lib/openserp-ingestion/national-utils.js";
import { selectNextBatch, markQueryExecuted, type RotationQuery } from "../../../lib/openserp-ingestion/query-rotation-planner.js";
import {
  defaultBudgetState,
  applyRunOutcome,
  activeEngines,
  MIN_BUDGET,
  START_BUDGET,
  MAX_BUDGET,
  CLEAN_RUNS_TO_ESCALATE,
} from "../../../lib/openserp-ingestion/budget-policy.js";
import { decideAdmission } from "../../../lib/openserp-ingestion/national-admission.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";
import type { OpenSerpRawResult } from "../../../lib/openserp-async/types.js";

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

test("OpenSERP ingestion flags default to false on empty env", () => {
  assert.equal(isOpenSerpAutomatedIngestionEnabled({}), false);
  assert.equal(isOpenSerpIngestionWriteEnabled({}), false);
  assert.equal(isOpenSerpIngestionCronEnabled({}), false);
});

test("OpenSERP ingestion flags require the literal string 'true'", () => {
  assert.equal(isOpenSerpAutomatedIngestionEnabled({ OPENSERP_AUTOMATED_INGESTION_ENABLED: "1" }), false);
  assert.equal(isOpenSerpAutomatedIngestionEnabled({ OPENSERP_AUTOMATED_INGESTION_ENABLED: "TRUE" }), false);
  assert.equal(isOpenSerpAutomatedIngestionEnabled({ OPENSERP_AUTOMATED_INGESTION_ENABLED: "true" }), true);
});

test("write is authorized only when BOTH ENABLED and WRITE_ENABLED are true", () => {
  assert.equal(isOpenSerpIngestionWriteAuthorized({ OPENSERP_AUTOMATED_INGESTION_ENABLED: "true" }), false);
  assert.equal(isOpenSerpIngestionWriteAuthorized({ OPENSERP_INGESTION_WRITE_ENABLED: "true" }), false);
  assert.equal(
    isOpenSerpIngestionWriteAuthorized({
      OPENSERP_AUTOMATED_INGESTION_ENABLED: "true",
      OPENSERP_INGESTION_WRITE_ENABLED: "true",
    }),
    true,
  );
});

test("cron is authorized only when all three flags are true", () => {
  assert.equal(
    isOpenSerpIngestionCronAuthorized({
      OPENSERP_AUTOMATED_INGESTION_ENABLED: "true",
      OPENSERP_INGESTION_WRITE_ENABLED: "true",
    }),
    false,
  );
  assert.equal(
    isOpenSerpIngestionCronAuthorized({
      OPENSERP_AUTOMATED_INGESTION_ENABLED: "true",
      OPENSERP_INGESTION_WRITE_ENABLED: "true",
      OPENSERP_INGESTION_CRON_ENABLED: "true",
    }),
    true,
  );
});

// ---------------------------------------------------------------------------
// Domain registry
// ---------------------------------------------------------------------------

test("domain registry: known approved domain is admissible and external_web_result", () => {
  const registry = loadSourceDomainRegistry();
  assert.equal(getDomainStatus("mubawab.ma", registry), "approved_discovery");
  assert.equal(isDomainAdmissible("mubawab.ma", registry), true);
  assert.equal(isDomainExternalWebResult("mubawab.ma", registry), true);
});

test("domain registry: explicitly blocked domain never admits", () => {
  const registry = loadSourceDomainRegistry();
  assert.equal(getDomainStatus("yakeey.com", registry), "blocked");
  assert.equal(isDomainAdmissible("yakeey.com", registry), false);
  assert.equal(getDomainStatus("immobilier.trovit.ma", registry), "blocked");
  assert.equal(isDomainAdmissible("nuroa.ma", registry), false);
});

test("domain registry: unknown domain defaults to unclassified, never admits", () => {
  const registry = loadSourceDomainRegistry();
  assert.equal(getDomainStatus("some-random-domain-never-seen.ma", registry), "unclassified");
  assert.equal(isDomainAdmissible("some-random-domain-never-seen.ma", registry), false);
});

test("domain registry: every entry has a compliance_note and reviewed_at", () => {
  const registry = loadSourceDomainRegistry();
  for (const entry of registry.domains) {
    assert.ok(entry.compliance_note.length > 0, `${entry.domain} missing compliance_note`);
    assert.ok(entry.reviewed_at.length > 0, `${entry.domain} missing reviewed_at`);
  }
});

// ---------------------------------------------------------------------------
// Price plausibility sanitization
// ---------------------------------------------------------------------------

test("sanitizePriceMad discards a price above the plausibility ceiling", () => {
  // Reproduces the shape of real anomalies found during this mission's own
  // Wave 2 Production apply: 50,000,000 MAD ("50 millions" -- ambiguous
  // MAD-vs-centimes phrasing) and 312,490,000 MAD (a greedy regex mashing
  // unrelated room/bathroom-count digits into the price capture).
  assert.equal(sanitizePriceMad(50_000_000), null);
  assert.equal(sanitizePriceMad(312_490_000), null);
});

test("sanitizePriceMad keeps a plausible price unchanged", () => {
  assert.equal(sanitizePriceMad(2_490_000), 2_490_000);
  assert.equal(sanitizePriceMad(500_000), 500_000);
  assert.equal(sanitizePriceMad(IMPLAUSIBLE_PRICE_CEILING_MAD), IMPLAUSIBLE_PRICE_CEILING_MAD);
});

test("sanitizePriceMad passes through null unchanged", () => {
  assert.equal(sanitizePriceMad(null), null);
});

// ---------------------------------------------------------------------------
// National geography
// ---------------------------------------------------------------------------

test("national geography: Tier 1 has exactly the 15 mission-specified cities", () => {
  assert.equal(TIER_1_CITIES.length, 15);
  assert.equal(getCityTier("Casablanca"), 1);
  assert.equal(getCityTier("Nador"), 1);
});

test("national geography: unrecognized city is neither tier 1 nor tier 2", () => {
  assert.equal(getCityTier("Atlantis"), null);
  assert.equal(isRecognizedCity("Atlantis"), false);
});

test("national geography: Tier 3 districts only exist for the 6 vetted cities", () => {
  assert.deepEqual(
    Object.keys(TIER_3_DISTRICTS).sort(),
    ["Agadir", "Casablanca", "Fès", "Marrakech", "Rabat", "Tanger"].sort(),
  );
  assert.ok(!Object.keys(TIER_3_DISTRICTS).includes("Salé"));
  assert.ok(!Object.keys(TIER_3_DISTRICTS).includes("Témara"));
});

// ---------------------------------------------------------------------------
// National city/district extraction
// ---------------------------------------------------------------------------

test("extractCityNational recognizes a Tier 1 city outside the original 3-city pilot set", () => {
  assert.equal(extractCityNational("Villa a vendre a Tanger centre"), "Tanger");
  assert.equal(extractCityNational("no city mentioned here"), null);
});

test("extractDistrictNational recognizes a Tier 3 district and its city", () => {
  const result = extractDistrictNational("Appartement a Agdal Rabat");
  assert.deepEqual(result, { city: "Rabat", district: "Agdal" });
});

// ---------------------------------------------------------------------------
// Query rotation planner
// ---------------------------------------------------------------------------

function rotationQuery(overrides: Partial<RotationQuery>): RotationQuery {
  return {
    query_id: "q1",
    city: "Casablanca",
    district: null,
    priority_tier: 1,
    last_executed_at: null,
    next_eligible_at: null,
    failure_count: 0,
    discovery_yield: 0,
    ...overrides,
  };
}

test("selectNextBatch prioritizes never-executed queries over executed ones", () => {
  const executed = rotationQuery({ query_id: "executed", last_executed_at: "2026-01-01T00:00:00Z", discovery_yield: 5 });
  const fresh = rotationQuery({ query_id: "fresh" });
  const batch = selectNextBatch([executed, fresh], 1, "2026-01-02T00:00:00Z");
  assert.equal(batch.length, 1);
  assert.equal(batch[0].query_id, "fresh");
});

test("selectNextBatch favors higher-tier (more specific) queries among never-executed ones", () => {
  const tier1 = rotationQuery({ query_id: "tier1", priority_tier: 1 });
  const tier3 = rotationQuery({ query_id: "tier3", priority_tier: 3 });
  const batch = selectNextBatch([tier1, tier3], 1, "2026-01-02T00:00:00Z");
  assert.equal(batch[0].query_id, "tier3");
});

test("selectNextBatch respects next_eligible_at (suspended queries excluded until eligible)", () => {
  const suspended = rotationQuery({ query_id: "suspended", next_eligible_at: "2026-06-01T00:00:00Z" });
  const batch = selectNextBatch([suspended], 5, "2026-01-01T00:00:00Z");
  assert.equal(batch.length, 0);
});

test("markQueryExecuted resets failure_count on success, increments on failure", () => {
  const q = rotationQuery({ failure_count: 2 });
  const succeeded = markQueryExecuted(q, { executedAtIso: "2026-01-01T00:00:00Z", succeeded: true, acceptedCount: 3 });
  assert.equal(succeeded.failure_count, 0);
  assert.equal(succeeded.last_executed_at, "2026-01-01T00:00:00Z");

  const failed = markQueryExecuted(q, { executedAtIso: "2026-01-01T00:00:00Z", succeeded: false, acceptedCount: 0 });
  assert.equal(failed.failure_count, 3);
});

// ---------------------------------------------------------------------------
// Budget / backoff policy
// ---------------------------------------------------------------------------

test("budget starts at 12 and drops to 4 immediately on any incident", () => {
  const state = defaultBudgetState();
  assert.equal(state.current_budget, START_BUDGET);
  const next = applyRunOutcome(
    state,
    { captcha_count: 1, status_403_429: 0, timeout_count: 0, error_rate: 0, quality_drift: false, engines_with_captcha_or_ratelimit: ["bing"] },
    "2026-01-01T00:00:00Z",
  );
  assert.equal(next.current_budget, MIN_BUDGET);
});

test("budget escalates to 24 only after 6 consecutive clean runs", () => {
  let state = defaultBudgetState();
  const clean = { captcha_count: 0, status_403_429: 0, timeout_count: 0, error_rate: 0, quality_drift: false, engines_with_captcha_or_ratelimit: [] as const };
  for (let i = 0; i < 5; i += 1) {
    state = applyRunOutcome(state, clean, "2026-01-01T00:00:00Z");
    assert.equal(state.current_budget, START_BUDGET, `should not escalate before 6 clean runs (run ${i + 1})`);
  }
  state = applyRunOutcome(state, clean, "2026-01-01T00:00:00Z");
  assert.equal(state.current_budget, START_BUDGET + 4);
});

test("budget never exceeds MAX_BUDGET", () => {
  let state = { ...defaultBudgetState(), current_budget: MAX_BUDGET };
  const clean = { captcha_count: 0, status_403_429: 0, timeout_count: 0, error_rate: 0, quality_drift: false, engines_with_captcha_or_ratelimit: [] as const };
  for (let i = 0; i < CLEAN_RUNS_TO_ESCALATE; i += 1) {
    state = applyRunOutcome(state, clean, "2026-01-01T00:00:00Z");
  }
  assert.equal(state.current_budget, MAX_BUDGET);
});

test("an engine that captchas is suspended for the incident window; others are unaffected", () => {
  const state = defaultBudgetState();
  const next = applyRunOutcome(
    state,
    { captcha_count: 1, status_403_429: 0, timeout_count: 0, error_rate: 0, quality_drift: false, engines_with_captcha_or_ratelimit: ["bing"] },
    "2026-01-01T00:00:00Z",
  );
  const active = activeEngines(next, "2026-01-01T00:00:01Z");
  assert.ok(!active.includes("bing"));
  assert.ok(active.includes("duckduckgo"));
  assert.ok(active.includes("ecosia"));
});

// ---------------------------------------------------------------------------
// National admission — domain registry gate, PII, confidence
// ---------------------------------------------------------------------------

function query(overrides: Partial<OpenSerpIngestionQuery> = {}): OpenSerpIngestionQuery {
  return {
    query_id: "q1",
    city: "Casablanca",
    district: "Maarif",
    transaction_type: "sale",
    property_type: "appartement",
    query_text: "appartement a vendre Casablanca Maarif",
    priority: "high",
    ...overrides,
  };
}

function rawResult(overrides: Partial<OpenSerpRawResult> = {}): OpenSerpRawResult {
  return {
    id: "r1",
    url: "https://www.mubawab.ma/fr/is/appartement-vente_casablanca_particulier",
    title: "Appartement a vendre Maarif Casablanca 85m2",
    snippet: "Bel appartement a vendre a Maarif Casablanca, 850000 DH, 85 m2, 2 chambres",
    rank: 1,
    ...overrides,
  } as OpenSerpRawResult;
}

test("decideAdmission admits a strong individual listing on an approved domain", () => {
  const decision = decideAdmission({
    result: rawResult(),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, true);
  assert.equal(decision.confidence, "high");
  assert.equal(decision.domain_status, "approved_discovery");
});

test("decideAdmission rejects the exact same listing content on an unclassified domain", () => {
  const decision = decideAdmission({
    result: rawResult({ url: "https://never-reviewed-domain.ma/appartement-vente_casablanca-12345" }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, false);
  assert.equal(decision.domain_status, "unclassified");
  assert.ok(decision.reasons.includes("domain_status_unclassified"));
});

test("decideAdmission rejects a category/hub page even on an approved domain", () => {
  const decision = decideAdmission({
    result: rawResult({
      url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",
      title: "Appartements a vendre a Casablanca",
      snippet: "1200 annonces d'appartements a vendre a Casablanca sur Mubawab",
    }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, false);
});

test("decideAdmission rejects a candidate whose content-derived transaction type contradicts its stored value", () => {
  // Reproduces the shape of a real anomaly found during this mission's own
  // Wave 1 Production apply: an admitted candidate's stored transaction_type
  // contradicted its own title's plain-language content. classify.ts derives
  // its stored value from title+snippet+URL combined -- a "vente"/"a vendre"
  // signal anywhere in that combined text wins (checked before "a louer" in
  // toTransactionType's if-chain), even if it comes from the snippet while
  // the title plainly says "a Louer" (rent). Re-deriving from the title
  // alone -- what a reader actually sees first -- gives "rent" instead.
  // This independent check must catch that disagreement and refuse to
  // admit rather than silently persist self-contradictory data.
  const decision = decideAdmission({
    result: rawResult({
      title: "Appartement a Louer Casablanca Particulier Mubawab",
      snippet: "Ce bien etait auparavant propose a la vente sur ce site",
    }),
    query: query({ transaction_type: "sale" }),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.includes("transaction_type_inconsistent"));
});

test("decideAdmission redacts a phone number from the snippet before persistence (PII sanitized, not silently kept)", () => {
  const decision = decideAdmission({
    result: rawResult({ snippet: "Appartement a vendre Maarif 85m2 2 chambres, contactez le 0612345678" }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.ok(!decision.classified?.snippet?.includes("0612345678"), "phone number must never survive into the persisted snippet");
});

test("decideAdmission rejects a result whose URL itself carries PII (never auto-redacted)", () => {
  const decision = decideAdmission({
    result: rawResult({ url: "https://www.mubawab.ma/fr/is/appartement-vente_casablanca_particulier?phone=0612345678" }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.includes("pii_or_secret_detected"));
});

test("decideAdmission never invents a price: no price text -> extracted price stays null", () => {
  const decision = decideAdmission({
    result: rawResult({ snippet: "Bel appartement a vendre a Maarif Casablanca, 85 m2, 2 chambres" }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  assert.equal(decision.classified?.extracted.price_mad, null);
});

test("decideAdmission never treats a zero price as valid", () => {
  const decision = decideAdmission({
    result: rawResult({ snippet: "Appartement a vendre Maarif Casablanca 0 DH, 85 m2, 2 chambres" }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-01-01T00:00:00Z",
    fallbackRank: 1,
  });
  // parsePriceMad requires >= 1000, so "0 DH" never parses as a price at all.
  assert.equal(decision.classified?.extracted.price_mad, null);
});

// ---------------------------------------------------------------------------
// Structural safety invariants (grep-based, whole new module surface)
// ---------------------------------------------------------------------------

const NEW_MODULE_DIR = join(process.cwd(), "lib/openserp-ingestion");

function listNewModuleFiles(): string[] {
  return readdirSync(NEW_MODULE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(NEW_MODULE_DIR, name));
}

test("no new OpenSERP ingestion module references duplicate_group_id", () => {
  for (const file of listNewModuleFiles()) {
    const content = readFileSync(file, "utf8");
    assert.ok(!content.includes("duplicate_group_id"), `${file} must never reference duplicate_group_id`);
  }
});

test("national-writer.ts never references manual_review/explicit_partner_identifier/legacy_one_to_one_projection", () => {
  const content = readFileSync(join(NEW_MODULE_DIR, "national-writer.ts"), "utf8");
  assert.ok(!content.includes("manual_review"));
  assert.ok(!content.includes("explicit_partner_identifier"));
  assert.ok(!content.includes("legacy_one_to_one_projection"));
});

test("national-writer.ts only ever assigns cluster_origin=deterministic_same_source_identifier", () => {
  const content = readFileSync(join(NEW_MODULE_DIR, "national-writer.ts"), "utf8");
  const clusterOriginAssignments = [...content.matchAll(/cluster_origin:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(clusterOriginAssignments.length > 0, "expected at least one cluster_origin assignment");
  for (const value of clusterOriginAssignments) {
    assert.equal(value, "deterministic_same_source_identifier");
  }
});

test("national-writer.ts never assigns origin_type to a partner-facing value", () => {
  const content = readFileSync(join(NEW_MODULE_DIR, "national-writer.ts"), "utf8");
  assert.ok(!content.includes('"partner_api"'));
  assert.ok(!content.includes('"partner_feed"'));
  assert.ok(!content.includes('"first_party_user"'));
  assert.ok(content.includes('"persisted_openserp"'));
});

test("run-orchestrator.ts never fetches a listing page directly (no fetch()/axios/got usage)", () => {
  const content = readFileSync(join(NEW_MODULE_DIR, "run-orchestrator.ts"), "utf8");
  assert.ok(!content.includes("fetch("));
  assert.ok(!content.includes("axios"));
});

test("cron route rejects requests without a matching Authorization header", async () => {
  const routeSource = readFileSync(join(process.cwd(), "app/api/internal/cron/openserp-ingestion/route.ts"), "utf8");
  assert.ok(routeSource.includes("OPENSERP_CRON_SECRET"));
  assert.ok(routeSource.includes("401"));
  assert.ok(routeSource.includes("isOpenSerpIngestionCronAuthorized"));
});

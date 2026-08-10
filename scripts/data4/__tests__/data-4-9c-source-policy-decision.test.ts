import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildRestrictivePatch,
  evidenceContainsRequiredPhrases,
  isOfficialEvidenceUrl,
  patchIsNonActivating,
  registryRowMatchesSafePrecondition,
  validateDecisionDocument,
  type PolicyDecisionDocument,
  type RegistryPolicyRow,
} from "../source-policy-decision";

const doc = JSON.parse(fs.readFileSync("data/source-policy/data-4-9c-decisions.json", "utf8")) as PolicyDecisionDocument;

function registryRow(overrides: Partial<RegistryPolicyRow> = {}): RegistryPolicyRow {
  return {
    source_domain: "agadirimmobilier.ma",
    source_name: "Agadir Immobilier",
    current_representation_count: 0,
    discovery_policy: "public_index_only",
    detail_fetch_policy: "legal_review_required",
    content_reuse_policy: "unknown",
    display_policy: "internal_signal_only",
    robots_status: "sitemap_declared",
    terms_status: "unverified",
    partnership_required: false,
    legal_review_required: true,
    no_bypass_required: true,
    evidence_urls: ["https://agadirimmobilier.ma/robots.txt"],
    evidence_summary: "prior evidence",
    recommended_action: "review",
    reviewed_at: "2026-08-01T00:00:00.000Z",
    next_review_at: "2026-08-21T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    policy_version: "source_registry_v2",
    authorization_status: "unverified",
    acquisition_mode: "public_index_internal_only",
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    max_revalidation_interval_days: 14,
    review_status: "current",
    policy_effective_at: null,
    policy_expires_at: null,
    evidence_observed_at: null,
    robots_observed_at: null,
    terms_observed_at: null,
    contact_status: "not_started",
    machine_gate: "internal_signal_only",
    policy_hash: null,
    ingestion_gate: "internal_signal_only",
    display_gate: "hidden",
    ...overrides,
  };
}

test("decision document is six-source, fail-closed and plans only Agadir restrictive mutation", () => {
  assert.deepEqual(validateDecisionDocument(doc), []);
  assert.equal(doc.sources.length, 6);
  const planned = doc.sources.filter((row) => row.registryMutationPlanned);
  assert.equal(planned.length, 1);
  assert.equal(planned[0]?.sourceDomain, "agadirimmobilier.ma");
  assert.equal(planned[0]?.decision, "permission_required");
  assert.equal(doc.sources.filter((row) => row.decision === "remain_unverified").length, 5);
});

test("official evidence URLs may use source subdomains but never leave HTTPS source origin", () => {
  assert.equal(isOfficialEvidenceUrl("immo-maroc.com", "https://en.immo-maroc.com/"), true);
  assert.equal(isOfficialEvidenceUrl("capital-properties.ma", "https://www.capital-properties.ma/en/"), true);
  assert.equal(isOfficialEvidenceUrl("valfoncier.ma", "http://valfoncier.ma/"), false);
  assert.equal(isOfficialEvidenceUrl("valfoncier.ma", "https://valfoncier.ma.evil.example/"), false);
});

test("required phrase matching is case-insensitive, whitespace-normalized and accent-preserving", () => {
  const body = "Services destinés à un USAGE PERSONNEL ET NON COMMERCIAL.  Toute reproduction, diffusion ou exploitation non autorisée est interdite.";
  assert.equal(evidenceContainsRequiredPhrases(body, [
    "usage personnel et non commercial",
    "Toute reproduction, diffusion ou exploitation non autorisée",
  ]), true);
  assert.equal(evidenceContainsRequiredPhrases(body, ["reuse authorized"]), false);
});

test("safe Registry precondition rejects active, represented or bypassed sources", () => {
  assert.equal(registryRowMatchesSafePrecondition(registryRow()), true);
  assert.equal(registryRowMatchesSafePrecondition(registryRow({ authorization_status: "limited_public_facts" })), false);
  assert.equal(registryRowMatchesSafePrecondition(registryRow({ display_gate: "canonical_link_only" })), false);
  assert.equal(registryRowMatchesSafePrecondition(registryRow({ current_representation_count: 1 })), false);
  assert.equal(registryRowMatchesSafePrecondition(registryRow({ no_bypass_required: false })), false);
});

test("planned Agadir patch is strictly restrictive and preserves hidden/internal gates", () => {
  const decision = doc.sources.find((row) => row.sourceDomain === "agadirimmobilier.ma")!;
  const patch = buildRestrictivePatch(registryRow(), decision, "2026-08-10T08:40:00.000Z", "sha256:test");
  assert.ok(patch);
  assert.equal(patch.authorization_status, "permission_required");
  assert.equal(patch.terms_status, "permission_required");
  assert.equal(patch.content_reuse_policy, "permission_required");
  assert.equal(patch.detail_fetch_policy, "permission_required");
  assert.equal(patch.ingestion_gate, "internal_signal_only");
  assert.equal(patch.display_gate, "hidden");
  assert.equal(patch.display_policy, "internal_signal_only");
  assert.equal(patch.machine_gate, "internal_signal_only");
  assert.equal(patch.partnership_required, true);
  assert.equal(patchIsNonActivating(patch), true);
  assert.ok(patch.evidence_urls.includes("https://agadirimmobilier.ma/termes-et-conditions/"));
});

test("remain-unverified sources never produce Registry mutations", () => {
  for (const decision of doc.sources.filter((row) => !row.registryMutationPlanned)) {
    const before = registryRow({ source_domain: decision.sourceDomain });
    assert.equal(buildRestrictivePatch(before, decision, "2026-08-10T08:40:00.000Z", "sha256:test"), null);
  }
});

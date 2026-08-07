import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  canonicalDecisionHash,
  resolveRegistryPolicy,
  validateAssignmentManifest,
  validateEvidenceAlignment,
  validateMigrationCoverage,
  type SourcePolicyEvidencePayload,
  type SourceRegistryAssignmentManifest,
  type TechnicalCapabilityPayload,
} from "../source-registry-assignment";

const manifest = JSON.parse(fs.readFileSync("scripts/census/data-1-6b-policy-decisions.json", "utf8")) as SourceRegistryAssignmentManifest;
const migrationSql = fs.readFileSync("supabase/migrations/20260807140000_data_1_6b_source_registry_assignment.sql", "utf8");

test("certified DATA-1.6B manifest is internally valid and hash-stable", () => {
  validateAssignmentManifest(manifest);
  assert.equal(manifest.assignments.length, 19);
  for (const decision of manifest.assignments) assert.equal(canonicalDecisionHash(decision), decision.policyHash);
});

test("resolved decisions keep every source non-activating and hidden", () => {
  const policies = manifest.assignments.map(resolveRegistryPolicy);
  assert.equal(policies.filter((policy) => policy.authorizationStatus === "prohibited").length, 1);
  assert.equal(policies.filter((policy) => policy.authorizationStatus === "permission_required").length, 3);
  assert.equal(policies.filter((policy) => policy.authorizationStatus === "unverified").length, 15);
  assert.equal(policies.filter((policy) => policy.acquisitionMode === "blocked").length, 1);
  assert.equal(policies.filter((policy) => policy.acquisitionMode === "public_index_internal_only").length, 18);
  assert.equal(policies.filter((policy) => policy.displayGate === "hidden").length, 19);
  assert.equal(policies.filter((policy) => policy.displayPolicy === "blocked").length, 1);
  assert.equal(policies.filter((policy) => policy.displayPolicy === "internal_signal_only").length, 18);
});

test("prestigeimmo is explicitly hard-blocked", () => {
  const decision = manifest.assignments.find((row) => row.domain === "prestigeimmo.ma");
  assert.ok(decision);
  const policy = resolveRegistryPolicy(decision);
  assert.equal(decision.decisionClass, "BLOCK_RESTRICTED");
  assert.equal(policy.authorizationStatus, "prohibited");
  assert.equal(policy.discoveryPolicy, "paused");
  assert.equal(policy.detailFetchPolicy, "prohibited");
  assert.equal(policy.contentReusePolicy, "prohibited");
  assert.equal(policy.acquisitionMode, "blocked");
  assert.equal(policy.machineGate, "blocked_invalid_no_bypass");
  assert.equal(policy.displayGate, "hidden");
});

test("migration is coverage-locked to explicit decisions and never writes generated execution_score", () => {
  validateMigrationCoverage(migrationSql, manifest);
  assert.match(migrationSql, /refuses to overwrite existing Source Registry rows/);
  assert.doesNotMatch(migrationSql, /\bon\s+conflict\b/i);
  assert.match(migrationSql, /safety invariant violated/);
  const insertColumns = migrationSql.match(/insert into public\.source_policy_registry\s*\(([\s\S]*?)\)\s*select/i)?.[1] ?? "";
  assert.doesNotMatch(insertColumns, /\bexecution_score\b/i);
});

test("policy hash drift fails closed", () => {
  const copy = structuredClone(manifest);
  copy.assignments[0].decisionClass = "INTERNAL_DISCOVERY_ACCESS_LIMITED";
  assert.throws(() => validateAssignmentManifest(copy), /policyHash does not match|requires INTERNAL_DISCOVERY_UNVERIFIED/);
});

test("evidence alignment accepts only certified status, URLs, scores and sitemap evidence", () => {
  const policyEvidence: SourcePolicyEvidencePayload = {
    reviews: manifest.assignments.map((decision) => ({
      domain: decision.domain,
      evidenceStatus: decision.evidenceStatus,
      reviewTrack: decision.reviewTrack,
      evidenceConfidenceScore: decision.policyConfidenceScore * 5,
      evidenceUrls: [...decision.evidenceUrls],
      robots: { status: decision.robotsStatus === "unverified" ? "UNAVAILABLE" : "PRESENT" },
      technicalCapability: { score: decision.structureScore * 5 },
    })),
  };
  const technicalEvidence: TechnicalCapabilityPayload = {
    audits: manifest.assignments.map((decision) => ({
      seed: { domain: decision.domain },
      technicalGate: "CAPABILITY_REVIEW_READY",
      robots: {
        status: decision.robotsStatus === "unverified" ? "UNAVAILABLE" : "PRESENT",
        sitemapUrls: decision.robotsStatus === "sitemap_declared" ? [`https://${decision.domain}/sitemap.xml`] : [],
      },
    })),
  };
  validateEvidenceAlignment(manifest, policyEvidence, technicalEvidence);

  const broken = structuredClone(technicalEvidence);
  const sitemapDecision = manifest.assignments.find((decision) => decision.robotsStatus === "sitemap_declared");
  assert.ok(sitemapDecision);
  const audit = broken.audits.find((row) => row.seed.domain === sitemapDecision.domain);
  assert.ok(audit);
  audit.robots.sitemapUrls = [];
  assert.throws(() => validateEvidenceAlignment(manifest, policyEvidence, broken), /sitemap_declared is not supported/);
});

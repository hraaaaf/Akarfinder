import fs from "node:fs/promises";
import path from "node:path";

import type { CertifiedSourceFactoryCohortManifest } from "../data-mass/source-factory-certified-cohort";
import {
  validateMidYieldReviewManifest,
  type MidYieldReviewManifest,
} from "../data-mass/source-factory-mid-yield-review";

const OUT_DIR = process.env.DATA_MASS_2C_OUT_DIR ?? ".tmp/data-mass-2c/results";
const COHORT_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const REVIEW_PATH = "data/data-mass-2c/mid-yield-source-review.json";
const TIMEOUT_MS = 30_000;

type RegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  allowed_discovery_channels: string[] | null;
  display_policy: string | null;
  display_gate: string | null;
  ingestion_gate: string | null;
  review_status: string | null;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-MASS-2C requires ${name}`);
  return value;
}

const supabaseOrigin = new URL(env("SUPABASE_URL")).origin;
let blockedNetworkRequests = 0;

async function allowedFetch(input: URL, init: RequestInit): Promise<Response> {
  if (input.origin !== supabaseOrigin) {
    blockedNetworkRequests += 1;
    throw new Error(`MASS-2C source-network firewall blocked ${input.origin}`);
  }
  return fetch(input, init);
}

async function registryRows(domains: string[]): Promise<RegistryRow[]> {
  const url = new URL("/rest/v1/source_policy_registry", env("SUPABASE_URL"));
  url.searchParams.set("select", "source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,display_policy,display_gate,ingestion_gate,review_status");
  url.searchParams.set("source_domain", `in.(${domains.join(",")})`);
  url.searchParams.set("order", "source_domain.asc");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await allowedFetch(url, {
    method: "GET",
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`source_policy_registry read failed: HTTP ${response.status} ${await response.text()}`);
  return (await response.json()) as RegistryRow[];
}

async function main(): Promise<void> {
  const [cohortRaw, reviewRaw] = await Promise.all([
    fs.readFile(COHORT_PATH, "utf8"),
    fs.readFile(REVIEW_PATH, "utf8"),
  ]);
  const cohort = JSON.parse(cohortRaw) as CertifiedSourceFactoryCohortManifest;
  const review = JSON.parse(reviewRaw) as MidYieldReviewManifest;
  const certifiedMidYield = cohort.cohort.slice(20, 50).map(({ rank, sourceDomain, massPotentialScore }) => ({ rank, sourceDomain, massPotentialScore }));
  validateMidYieldReviewManifest(review, certifiedMidYield, new Date().toISOString());

  const currentRegistry = await registryRows(review.records.map((r) => r.sourceDomain));
  const currentRegistryDomains = currentRegistry.map((r) => r.source_domain.toLowerCase()).sort();

  const proof = {
    schemaVersion: "MASS_2C_PROOF_V1",
    generatedAt: new Date().toISOString(),
    inputMode: "MASS_1_CERTIFIED_MID_YIELD_WITH_MASS_2B_PREDECESSOR_AND_REGISTRY_DRIFT_CHECK",
    readOnly: true,
    databaseWrites: 0,
    ddlChanges: 0,
    registryWrites: 0,
    policyChanges: 0,
    blockedNetworkRequests,
    sourceNetworkRequests: 0,
    sourceSiteRequests: 0,
    detailPageFetches: 0,
    publicRowsCreated: 0,
    searchActivations: 0,
    permissionsInferred: 0,
    publicActivableNowCount: 0,
    registryWriteAllowedCount: 0,
    mass2bFinalHead: review.predecessor.mass2bFinalHead,
    mass2bFinalRunId: review.predecessor.mass2bFinalRunId,
    mass2bFinalArtifactId: review.predecessor.mass2bFinalArtifactId,
    mass2bFinalArtifactDigest: review.predecessor.mass2bFinalArtifactDigest,
    mass2bMergeCommit: review.predecessor.mass2bMergeCommit,
    domainsReviewed: review.records.length,
    permissionRequiredCount: review.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length,
    holdCount: review.records.filter((r) => r.decision === "HOLD").length,
    canonicalLinkCandidateCount: review.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length,
    canonicalLinkApprovedCount: 0,
    directAcquisitionAllowedCount: 0,
    copyPhotosAllowedCount: 0,
    copyDescriptionAllowedCount: 0,
    sourceAttributionRequiredCount: review.safety.sourceAttributionRequired ? review.records.length : 0,
    currentRegistryRowsForReviewedDomains: currentRegistry.length,
    currentRegistryDomains,
    registryDriftSinceReviewCount: currentRegistry.length,
    doctrine: review.doctrine,
  };

  const summary = [
    "# MASS-2C — Mid-Yield Source Review",
    "",
    `Generated: ${proof.generatedAt}`,
    `- Reviewed: ${proof.domainsReviewed}/30 certified mid-yield domains`,
    `- PERMISSION_REQUIRED: ${proof.permissionRequiredCount}`,
    `- HOLD: ${proof.holdCount}`,
    `- Canonical-link candidates: ${proof.canonicalLinkCandidateCount} (0 approved)`,
    `- Current Registry rows for reviewed domains: ${proof.currentRegistryRowsForReviewedDomains}`,
    "- Direct acquisition allowed: 0",
    "- DB/DDL/Registry/Search mutations: 0",
    "- Source/detail fetches by CI audit: 0",
    "",
  ].join("\n");

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(OUT_DIR, "review.json"), `${JSON.stringify(review, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(OUT_DIR, "summary.md"), summary, "utf8"),
  ]);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

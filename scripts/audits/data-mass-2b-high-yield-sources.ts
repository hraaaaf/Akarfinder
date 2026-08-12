import fs from "node:fs/promises";
import path from "node:path";

import type { CertifiedSourceFactoryCohortManifest } from "../data-mass/source-factory-certified-cohort";
import {
  validateHighYieldReviewManifest,
  type HighYieldReviewManifest,
} from "../data-mass/source-factory-high-yield-review";

const OUT_DIR = process.env.DATA_MASS_2B_OUT_DIR ?? ".tmp/data-mass-2b/results";
const COHORT_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const REVIEW_PATH = "data/data-mass-2b/high-yield-source-review.json";
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
  if (!value) throw new Error(`DATA-MASS-2B requires ${name}`);
  return value;
}

const supabaseOrigin = new URL(env("SUPABASE_URL")).origin;
let sourceNetworkRequests = 0;

async function allowedFetch(input: URL, init: RequestInit): Promise<Response> {
  if (input.origin !== supabaseOrigin) {
    sourceNetworkRequests += 1;
    throw new Error(`MASS-2B source-network firewall blocked ${input.origin}`);
  }
  return fetch(input, init);
}

async function registryRows(domains: string[]): Promise<RegistryRow[]> {
  const url = new URL("/rest/v1/source_policy_registry", env("SUPABASE_URL"));
  url.searchParams.set(
    "select",
    "source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,display_policy,display_gate,ingestion_gate,review_status",
  );
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
  const review = JSON.parse(reviewRaw) as HighYieldReviewManifest;
  const certifiedHighYield = cohort.cohort.slice(0, 20).map(({ rank, sourceDomain, massPotentialScore }) => ({
    rank,
    sourceDomain,
    massPotentialScore,
  }));

  validateHighYieldReviewManifest(review, certifiedHighYield, new Date().toISOString());

  const currentRegistry = await registryRows(review.records.map((record) => record.sourceDomain));
  const registryDomains = currentRegistry.map((row) => row.source_domain.toLowerCase()).sort();
  const reviewedDomains = new Set(review.records.map((record) => record.sourceDomain.toLowerCase()));
  const unexpectedRegistryDomains = registryDomains.filter((domain) => reviewedDomains.has(domain));

  const proof = {
    schemaVersion: "MASS_2B_PROOF_V1",
    generatedAt: new Date().toISOString(),
    inputMode: "MASS_2A_CERTIFIED_HIGH_YIELD_WITH_CURRENT_REGISTRY_DRIFT_CHECK",
    readOnly: true,
    databaseWrites: 0,
    ddlChanges: 0,
    registryWrites: 0,
    policyChanges: 0,
    sourceNetworkRequests,
    sourceSiteRequests: 0,
    detailPageFetches: 0,
    publicRowsCreated: 0,
    searchActivations: 0,
    permissionsInferred: 0,
    publicActivableNowCount: 0,
    registryWriteAllowedCount: 0,
    mass2aFinalHead: review.predecessor.mass2aFinalHead,
    mass2aFinalRunId: review.predecessor.mass2aFinalRunId,
    mass2aFinalArtifactId: review.predecessor.mass2aFinalArtifactId,
    mass2aFinalArtifactDigest: review.predecessor.mass2aFinalArtifactDigest,
    mass2aMergeCommit: review.predecessor.mass2aMergeCommit,
    domainsReviewed: review.records.length,
    permissionRequiredCount: review.records.filter((record) => record.decision === "PERMISSION_REQUIRED").length,
    holdCount: review.records.filter((record) => record.decision === "HOLD").length,
    policyCompatibleCount: 0,
    canonicalLinkApprovedCount: 0,
    canonicalLinkCandidateCount: review.records.filter(
      (record) => record.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE",
    ).length,
    directAcquisitionAllowedCount: review.safety.directAcquisitionAllowed ? review.records.length : 0,
    copyPhotosAllowedCount: review.safety.copyPhotosAllowed ? review.records.length : 0,
    copyDescriptionAllowedCount: review.safety.copyDescriptionAllowed ? review.records.length : 0,
    sourceAttributionRequiredCount: review.safety.sourceAttributionRequired ? review.records.length : 0,
    reviewRegistrySnapshotExpected: "UNREGISTERED_AT_REVIEW",
    currentRegistryRowsForReviewedDomains: currentRegistry.length,
    currentRegistryDomains: registryDomains,
    registryDriftSinceReview: unexpectedRegistryDomains,
    registryDriftSinceReviewCount: unexpectedRegistryDomains.length,
    doctrine: review.doctrine,
  };

  const summary = [
    "# MASS-2B — High-Yield Source Review",
    "",
    `Generated: ${proof.generatedAt}`,
    "",
    `- Reviewed: ${proof.domainsReviewed}/20 certified high-yield domains`,
    `- PERMISSION_REQUIRED: ${proof.permissionRequiredCount}`,
    `- HOLD: ${proof.holdCount}`,
    `- Canonical-link-only candidates: ${proof.canonicalLinkCandidateCount} (candidate only; not approved)`,
    `- Direct acquisition allowed: ${proof.directAcquisitionAllowedCount}`,
    `- Current Registry rows for reviewed domains: ${proof.currentRegistryRowsForReviewedDomains}`,
    `- Registry drift since review: ${proof.registryDriftSinceReviewCount}`,
    "- DB/DDL/Registry/Search mutations: 0",
    "- Source/detail fetches by CI audit: 0",
    "",
    "Direct acquisition and public minimal indexing are deliberately separate axes. Attribution does not override source terms.",
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

await main();

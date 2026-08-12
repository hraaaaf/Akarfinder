import fs from "node:fs/promises";
import path from "node:path";
import type { CertifiedSourceFactoryCohortManifest } from "../data-mass/source-factory-certified-cohort";
import { validateLongTailReviewManifest, type LongTailReviewManifest } from "../data-mass/source-factory-long-tail-review";

const OUT_DIR = process.env.DATA_MASS_2D_OUT_DIR ?? ".tmp/data-mass-2d/results";
const COHORT_PATH = "data/data-mass-2a/mass-1-certified-source-factory.json";
const REVIEW_PATH = "data/data-mass-2d/long-tail-source-review.json";

type RegistryRow = { source_domain: string };
function env(name: string): string { const value = process.env[name]; if (!value) throw new Error(`DATA-MASS-2D requires ${name}`); return value; }
const supabaseOrigin = new URL(env("SUPABASE_URL")).origin;
let blockedNetworkRequests = 0;
async function allowedFetch(input: URL, init: RequestInit): Promise<Response> {
  if (input.origin !== supabaseOrigin) { blockedNetworkRequests += 1; throw new Error(`MASS-2D source-network firewall blocked ${input.origin}`); }
  return fetch(input, init);
}
async function registryRows(domains: string[]): Promise<RegistryRow[]> {
  const url = new URL("/rest/v1/source_policy_registry", env("SUPABASE_URL"));
  url.searchParams.set("select", "source_domain");
  url.searchParams.set("source_domain", `in.(${domains.join(",")})`);
  url.searchParams.set("order", "source_domain.asc");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await allowedFetch(url, { method: "GET", headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`source_policy_registry read failed: HTTP ${response.status} ${await response.text()}`);
  return await response.json() as RegistryRow[];
}
async function main(): Promise<void> {
  const [cohortRaw, reviewRaw] = await Promise.all([fs.readFile(COHORT_PATH, "utf8"), fs.readFile(REVIEW_PATH, "utf8")]);
  const cohort = JSON.parse(cohortRaw) as CertifiedSourceFactoryCohortManifest;
  const review = JSON.parse(reviewRaw) as LongTailReviewManifest;
  const certified = cohort.cohort.slice(50, 101).map(({ rank, sourceDomain, massPotentialScore }) => ({ rank, sourceDomain, massPotentialScore }));
  validateLongTailReviewManifest(review, certified, new Date().toISOString());
  const currentRegistry = await registryRows(review.records.map((r) => r.sourceDomain));
  const proof = {
    schemaVersion: "MASS_2D_PROOF_V1", generatedAt: new Date().toISOString(), readOnly: true,
    databaseWrites: 0, ddlChanges: 0, registryWrites: 0, policyChanges: 0,
    blockedNetworkRequests, sourceNetworkRequests: 0, sourceSiteRequests: 0, detailPageFetches: 0,
    publicRowsCreated: 0, searchActivations: 0, permissionsInferred: 0, publicActivableNowCount: 0,
    domainsReviewed: review.records.length,
    permissionRequiredCount: review.records.filter((r) => r.decision === "PERMISSION_REQUIRED").length,
    holdCount: review.records.filter((r) => r.decision === "HOLD").length,
    canonicalLinkCandidateCount: review.records.filter((r) => r.publicIndexingMode === "CANONICAL_LINK_ONLY_CANDIDATE").length,
    canonicalLinkApprovedCount: 0, directAcquisitionAllowedCount: 0,
    currentRegistryRowsForReviewedDomains: currentRegistry.length,
    currentRegistryDomains: currentRegistry.map((r) => r.source_domain.toLowerCase()).sort(),
    registryDriftSinceReviewCount: currentRegistry.length,
    totals: review.summary,
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "review.json"), `${JSON.stringify(review, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "summary.md"), `# MASS-2D — Long-Tail Source Review\n\n- Reviewed: ${proof.domainsReviewed}/51\n- PERMISSION_REQUIRED: ${proof.permissionRequiredCount}\n- HOLD: ${proof.holdCount}\n- Registry drift: ${proof.registryDriftSinceReviewCount}\n- Writes/fetches/activations: 0\n`),
  ]);
  console.log(JSON.stringify(proof, null, 2));
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

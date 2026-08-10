import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  chooseRegistryRobotsUrl,
  conservativeUrlIdentity,
  readDeclaredSitemaps,
  registryIsCurrentOnboardingCandidate,
  type RegistryRow,
} from "../data4/mass-source-onboarding-qualification";
import {
  DATA_4_9B_SOURCES,
  classifyStructuralIdentity,
  getStructuralRule,
  isCritical49bSource,
  type ClassifiedIdentity,
  type Data49bSource,
} from "../data4/high-capacity-structural-detail-qualification";

const OUT_DIR = process.env.DATA_4_9B_OUT_DIR ?? ".tmp/data-4-9b/results";
const PAGE_SIZE = 1000;
const REST_TIMEOUT_MS = 20_000;

type SeedRow = { canonical_url: string };

type SourceResult = {
  sourceDomain: Data49bSource;
  critical: boolean;
  status: "QUALIFIED_STRUCTURAL" | "BLOCKED_POLICY_SNAPSHOT" | "BLOCKED_SOURCE_EVIDENCE";
  blocker: string | null;
  registry: {
    authorizationStatus: string | null;
    termsStatus: string | null;
    reviewStatus: string | null;
    nextReviewAt: string | null;
    displayGate: string | null;
    ingestionGate: string | null;
    robotsUrl: string | null;
    publicDisplayAuthorizedByThisLot: false;
    ingestionAuthorizedByThisLot: false;
    policyMutationAuthorizedByThisLot: false;
  };
  structure: {
    detailPatterns: readonly string[];
    namespaceRootPatterns: readonly string[];
    blockedPatterns: readonly string[];
    authorizationAuthority: false;
  };
  currentSourceEvidence: {
    sitemapRoots: string[];
    sitemapUrlRows: number;
    capacityKind: "complete" | "lower_bound_request_cap" | "lower_bound_url_cap" | null;
    sourceRequests: number;
    detailPageFetches: 0;
  };
  identity: {
    seedRows: number;
    existingSeedIdentityMatches: number;
    netNewIdentityRows: number;
    collisionIdentityRows: number;
    collisionRawUrlRows: number;
    structuralDetailCandidateRows: number;
    rejectedIdentityRows: number;
    candidateDigestSha256: string | null;
    rejectDigestSha256: string | null;
  };
  rejectsByReason: Record<string, number>;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.9B requires ${name}`);
  return value;
}

function authHeaders(): Record<string, string> {
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, requiredEnv("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    signal: AbortSignal.timeout(REST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed ${response.status}: ${await response.text()}`);
  return await response.json() as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function sha256Lines(lines: string[]): string {
  return crypto.createHash("sha256").update(lines.join("\n")).digest("hex");
}

function emptyReasonCounts(): Record<string, number> {
  return {
    REJECT_NAMESPACE_ROOT: 0,
    REJECT_TAXONOMY_OR_ARCHIVE: 0,
    REJECT_NO_DETAIL_PATTERN: 0,
    REJECT_IDENTITY_COLLISION: 0,
  };
}

function registryAllows49b(domain: Data49bSource, row: RegistryRow, observedAt: Date): boolean {
  return row.authorization_status === "unverified"
    && registryIsCurrentOnboardingCandidate(domain, row, observedAt);
}

async function qualifySource(
  sourceDomain: Data49bSource,
  observedAt: Date,
): Promise<{ result: SourceResult; candidates: ClassifiedIdentity[]; rejects: ClassifiedIdentity[] }> {
  const rule = getStructuralRule(sourceDomain);
  const [registryRows, seedRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,display_gate,ingestion_gate,robots_status,terms_status,review_status,next_review_at,current_representation_count,evidence_urls",
      source_domain: `eq.${sourceDomain}`,
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url",
      source_domain: `eq.${sourceDomain}`,
    }),
  ]);

  const registry = registryRows[0] ?? null;
  const robotsUrl = registry ? chooseRegistryRobotsUrl(sourceDomain, registry.evidence_urls) : null;
  const registrySummary = {
    authorizationStatus: registry?.authorization_status ?? null,
    termsStatus: registry?.terms_status ?? null,
    reviewStatus: registry?.review_status ?? null,
    nextReviewAt: registry?.next_review_at ?? null,
    displayGate: registry?.display_gate ?? null,
    ingestionGate: registry?.ingestion_gate ?? null,
    robotsUrl,
    publicDisplayAuthorizedByThisLot: false as const,
    ingestionAuthorizedByThisLot: false as const,
    policyMutationAuthorizedByThisLot: false as const,
  };
  const structure = {
    detailPatterns: rule.detailPatterns,
    namespaceRootPatterns: rule.namespaceRootPatterns,
    blockedPatterns: rule.blockedPatterns,
    authorizationAuthority: false as const,
  };

  const blockedBase = {
    sourceDomain,
    critical: rule.critical,
    registry: registrySummary,
    structure,
    currentSourceEvidence: {
      sitemapRoots: [] as string[],
      sitemapUrlRows: 0,
      capacityKind: null,
      sourceRequests: 0,
      detailPageFetches: 0 as const,
    },
    identity: {
      seedRows: seedRows.length,
      existingSeedIdentityMatches: 0,
      netNewIdentityRows: 0,
      collisionIdentityRows: 0,
      collisionRawUrlRows: 0,
      structuralDetailCandidateRows: 0,
      rejectedIdentityRows: 0,
      candidateDigestSha256: null,
      rejectDigestSha256: null,
    },
    rejectsByReason: emptyReasonCounts(),
  };

  if (!registry || registryRows.length !== 1 || !robotsUrl || !registryAllows49b(sourceDomain, registry, observedAt)) {
    return {
      result: {
        ...blockedBase,
        status: "BLOCKED_POLICY_SNAPSHOT",
        blocker: "registry_unverified_hidden_internal_only_gate_failed",
      },
      candidates: [],
      rejects: [],
    };
  }

  let sitemap;
  try {
    sitemap = await readDeclaredSitemaps(sourceDomain, robotsUrl);
  } catch (error) {
    return {
      result: {
        ...blockedBase,
        status: "BLOCKED_SOURCE_EVIDENCE",
        blocker: error instanceof Error ? error.message : String(error),
      },
      candidates: [],
      rejects: [],
    };
  }

  const seedIdentities = new Set<string>();
  for (const row of seedRows) {
    const identity = conservativeUrlIdentity(sourceDomain, row.canonical_url);
    if (identity) seedIdentities.add(identity);
  }

  const buckets = new Map<string, string[]>();
  for (const canonicalUrl of sitemap.urls) {
    const identity = conservativeUrlIdentity(sourceDomain, canonicalUrl);
    if (!identity) continue;
    const rows = buckets.get(identity) ?? [];
    rows.push(canonicalUrl);
    buckets.set(identity, rows);
  }

  const classified: ClassifiedIdentity[] = [];
  let existingSeedIdentityMatches = 0;
  for (const [identity, canonicalUrls] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (seedIdentities.has(identity)) {
      existingSeedIdentityMatches += 1;
      continue;
    }
    classified.push(classifyStructuralIdentity(sourceDomain, identity, canonicalUrls));
  }

  const candidates = classified.filter((row) => row.classification === "DETAIL_PATTERN_MATCH");
  const rejects = classified.filter((row) => row.classification !== "DETAIL_PATTERN_MATCH");
  const reasonCounts = emptyReasonCounts();
  for (const row of rejects) reasonCounts[row.classification] = (reasonCounts[row.classification] ?? 0) + 1;
  const collisions = rejects.filter((row) => row.classification === "REJECT_IDENTITY_COLLISION");

  const result: SourceResult = {
    sourceDomain,
    critical: rule.critical,
    status: "QUALIFIED_STRUCTURAL",
    blocker: null,
    registry: registrySummary,
    structure,
    currentSourceEvidence: {
      sitemapRoots: sitemap.roots,
      sitemapUrlRows: sitemap.urls.length,
      capacityKind: sitemap.capacityKind,
      sourceRequests: sitemap.sourceRequests,
      detailPageFetches: 0,
    },
    identity: {
      seedRows: seedRows.length,
      existingSeedIdentityMatches,
      netNewIdentityRows: classified.length,
      collisionIdentityRows: collisions.length,
      collisionRawUrlRows: collisions.reduce((sum, row) => sum + row.canonicalUrls.length, 0),
      structuralDetailCandidateRows: candidates.length,
      rejectedIdentityRows: rejects.length,
      candidateDigestSha256: sha256Lines(candidates.map((row) => `${row.identity}\t${row.canonicalUrls[0] ?? ""}`)),
      rejectDigestSha256: sha256Lines(rejects.map((row) => `${row.identity}\t${row.classification}\t${row.canonicalUrls.join("|")}`)),
    },
    rejectsByReason: reasonCounts,
  };

  return { result, candidates, rejects };
}

async function main(): Promise<void> {
  const observedAt = new Date();
  const results: SourceResult[] = [];
  const candidateManifest: ClassifiedIdentity[] = [];
  const rejectManifest: ClassifiedIdentity[] = [];

  for (const sourceDomain of DATA_4_9B_SOURCES) {
    const qualified = await qualifySource(sourceDomain, observedAt);
    results.push(qualified.result);
    candidateManifest.push(...qualified.candidates);
    rejectManifest.push(...qualified.rejects);
  }

  const qualified = results.filter((row) => row.status === "QUALIFIED_STRUCTURAL");
  const qualifiedCritical = qualified.filter((row) => row.critical);
  const proof = {
    schemaVersion: "data-4-9b-high-capacity-structural-detail-qualification-v1",
    lot: "DATA-4.9B",
    mode: "READ_ONLY_STRUCTURAL_DETAIL_QUALIFICATION",
    observedAt: observedAt.toISOString(),
    responsibility: "Convert raw sitemap capacity into conservative structural detail candidates without detail-page fetch, policy mutation, ingestion, or publication.",
    sourceCount: DATA_4_9B_SOURCES.length,
    criticalSourceCount: DATA_4_9B_SOURCES.filter(isCritical49bSource).length,
    optionalNonBlockingSources: DATA_4_9B_SOURCES.filter((domain) => !isCritical49bSource(domain)),
    qualifiedSourceCount: qualified.length,
    qualifiedCriticalSourceCount: qualifiedCritical.length,
    blockedSourceCount: results.length - qualified.length,
    summary: {
      netNewIdentityRows: qualified.reduce((sum, row) => sum + row.identity.netNewIdentityRows, 0),
      structuralDetailCandidateRows: candidateManifest.length,
      rejectedIdentityRows: rejectManifest.length,
      collisionIdentityRows: qualified.reduce((sum, row) => sum + row.identity.collisionIdentityRows, 0),
      collisionRawUrlRows: qualified.reduce((sum, row) => sum + row.identity.collisionRawUrlRows, 0),
    },
    truthBoundary: {
      structuralDetailCandidateRowsAreUrlRepresentationsNotUniqueProperties: true,
      deduplicatedUniquePropertyCountProducedByThisLot: false,
      structuralPatternMatchIsNotPublicAuthorization: true,
      structureRulesAuthorizationAuthority: false,
      robotsOrSitemapIsNotPermission: true,
      publicDisplayAuthorizedByThisLot: false,
      ingestionAuthorizedByThisLot: false,
      policyMutationAuthorizedByThisLot: false,
    },
    databaseWrites: 0,
    registryWrites: 0,
    policyChanges: 0,
    ingestionActivations: 0,
    publicDisplayActivations: 0,
    detailPageFetches: 0,
    nextDecision: "Rank structural-detail winners for a separate Source Policy Decision lot; no seed/write/Search activation is authorized by DATA-4.9B.",
    results,
  };

  if (proof.summary.netNewIdentityRows !== proof.summary.structuralDetailCandidateRows + proof.summary.rejectedIdentityRows) {
    throw new Error("DATA-4.9B identity accounting mismatch");
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), JSON.stringify(proof, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "candidate-manifest.json"), JSON.stringify(candidateManifest, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "reject-manifest.json"), JSON.stringify(rejectManifest, null, 2) + "\n"),
  ]);

  console.log(JSON.stringify({
    observedAt: proof.observedAt,
    qualifiedSourceCount: proof.qualifiedSourceCount,
    qualifiedCriticalSourceCount: proof.qualifiedCriticalSourceCount,
    blockedSourceCount: proof.blockedSourceCount,
    netNewIdentityRows: proof.summary.netNewIdentityRows,
    structuralDetailCandidateRows: proof.summary.structuralDetailCandidateRows,
    rejectedIdentityRows: proof.summary.rejectedIdentityRows,
    bySource: results.map((row) => ({
      sourceDomain: row.sourceDomain,
      critical: row.critical,
      status: row.status,
      blocker: row.blocker,
      netNew: row.identity.netNewIdentityRows,
      candidates: row.identity.structuralDetailCandidateRows,
      rejects: row.identity.rejectedIdentityRows,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

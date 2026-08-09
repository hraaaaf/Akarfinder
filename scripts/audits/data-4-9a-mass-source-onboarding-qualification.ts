import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DATA_4_9A_CANDIDATES,
  computeMassScore,
  conservativeUrlIdentity,
  massRecommendation,
  readDeclaredSitemaps,
  registryIsCurrentOnboardingCandidate,
  summarizePathSignals,
  type RegistryRow,
} from "../data4/mass-source-onboarding-qualification";

const OUT_DIR = process.env.DATA_4_9A_OUT_DIR ?? ".tmp/data-4-9a/results";
const PAGE_SIZE = 1000;
const REST_TIMEOUT_MS = 20_000;

type SeedRow = { canonical_url: string };

type SourceResult = {
  sourceDomain: string;
  status: "QUALIFIED_CAPACITY" | "BLOCKED_POLICY_SNAPSHOT" | "BLOCKED_SOURCE_EVIDENCE";
  blocker: string | null;
  registry: {
    authorizationStatus: string | null;
    termsStatus: string | null;
    reviewStatus: string | null;
    nextReviewAt: string | null;
    displayGate: string | null;
    ingestionGate: string | null;
    currentRepresentationCount: number;
    publicDisplayAuthorizedByThisLot: false;
  };
  currentSourceEvidence: {
    declaredSitemapRoots: string[];
    observedSitemapUrls: number;
    capacityKind: "complete" | "lower_bound_request_cap" | "lower_bound_url_cap" | null;
    sourceRequests: number;
    detailPageFetches: 0;
  };
  identity: {
    uniqueSitemapIdentities: number;
    sitemapIdentityCollisionRows: number;
    existingSeedIdentityMatches: number;
    observedNetNewSitemapIdentityCapacity: number;
    capacityInterpretation: "complete_upper_bound" | "observed_lower_bound" | "unavailable";
    digestSha256: string | null;
  };
  pathSignals: ReturnType<typeof summarizePathSignals> | null;
  massScore: number;
  recommendation: ReturnType<typeof massRecommendation> | "BLOCKED";
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.9A requires ${name}`);
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

function digest(lines: string[]): string {
  return crypto.createHash("sha256").update(lines.join("\n")).digest("hex");
}

async function qualifySource(domain: typeof DATA_4_9A_CANDIDATES[number], observedAt: Date): Promise<SourceResult> {
  const [registryRows, seedRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,display_gate,ingestion_gate,robots_status,terms_status,review_status,next_review_at,current_representation_count",
      source_domain: `eq.${domain}`,
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url",
      source_domain: `eq.${domain}`,
    }),
  ]);

  const registry = registryRows[0] ?? null;
  const registrySummary = {
    authorizationStatus: registry?.authorization_status ?? null,
    termsStatus: registry?.terms_status ?? null,
    reviewStatus: registry?.review_status ?? null,
    nextReviewAt: registry?.next_review_at ?? null,
    displayGate: registry?.display_gate ?? null,
    ingestionGate: registry?.ingestion_gate ?? null,
    currentRepresentationCount: registry?.current_representation_count ?? 0,
    publicDisplayAuthorizedByThisLot: false as const,
  };

  if (!registry || registryRows.length !== 1 || !registryIsCurrentOnboardingCandidate(domain, registry, observedAt)) {
    return {
      sourceDomain: domain,
      status: "BLOCKED_POLICY_SNAPSHOT",
      blocker: "registry_onboarding_candidate_gate_failed",
      registry: registrySummary,
      currentSourceEvidence: { declaredSitemapRoots: [], observedSitemapUrls: 0, capacityKind: null, sourceRequests: 0, detailPageFetches: 0 },
      identity: {
        uniqueSitemapIdentities: 0,
        sitemapIdentityCollisionRows: 0,
        existingSeedIdentityMatches: 0,
        observedNetNewSitemapIdentityCapacity: 0,
        capacityInterpretation: "unavailable",
        digestSha256: null,
      },
      pathSignals: null,
      massScore: 0,
      recommendation: "BLOCKED",
    };
  }

  let sitemap;
  try {
    sitemap = await readDeclaredSitemaps(domain);
  } catch (error) {
    return {
      sourceDomain: domain,
      status: "BLOCKED_SOURCE_EVIDENCE",
      blocker: error instanceof Error ? error.message : String(error),
      registry: registrySummary,
      currentSourceEvidence: { declaredSitemapRoots: [], observedSitemapUrls: 0, capacityKind: null, sourceRequests: 0, detailPageFetches: 0 },
      identity: {
        uniqueSitemapIdentities: 0,
        sitemapIdentityCollisionRows: 0,
        existingSeedIdentityMatches: 0,
        observedNetNewSitemapIdentityCapacity: 0,
        capacityInterpretation: "unavailable",
        digestSha256: null,
      },
      pathSignals: null,
      massScore: 0,
      recommendation: "BLOCKED",
    };
  }

  const buckets = new Map<string, string[]>();
  for (const rawUrl of sitemap.urls) {
    const identity = conservativeUrlIdentity(domain, rawUrl);
    if (!identity) continue;
    const rows = buckets.get(identity) ?? [];
    rows.push(rawUrl);
    buckets.set(identity, rows);
  }

  const uniqueSitemapIdentities = [...buckets.entries()].filter(([, rows]) => rows.length === 1);
  const sitemapIdentityCollisionRows = [...buckets.values()].filter((rows) => rows.length > 1).reduce((sum, rows) => sum + rows.length, 0);

  const seedIdentities = new Set<string>();
  for (const row of seedRows) {
    const identity = conservativeUrlIdentity(domain, row.canonical_url);
    if (identity) seedIdentities.add(identity);
  }

  const netNewIdentities = uniqueSitemapIdentities
    .map(([identity]) => identity)
    .filter((identity) => !seedIdentities.has(identity))
    .sort();
  const existingSeedIdentityMatches = uniqueSitemapIdentities.length - netNewIdentities.length;
  const capacityInterpretation = sitemap.capacityKind === "complete" ? "complete_upper_bound" as const : "observed_lower_bound" as const;
  const massScore = computeMassScore({
    observedNetNewIdentities: netNewIdentities.length,
    sourceRequests: sitemap.sourceRequests,
    collisionRows: sitemapIdentityCollisionRows,
    uniqueIdentityRows: uniqueSitemapIdentities.length,
    capacityKind: sitemap.capacityKind,
  });

  return {
    sourceDomain: domain,
    status: "QUALIFIED_CAPACITY",
    blocker: null,
    registry: registrySummary,
    currentSourceEvidence: {
      declaredSitemapRoots: sitemap.roots,
      observedSitemapUrls: sitemap.urls.length,
      capacityKind: sitemap.capacityKind,
      sourceRequests: sitemap.sourceRequests,
      detailPageFetches: 0,
    },
    identity: {
      uniqueSitemapIdentities: uniqueSitemapIdentities.length,
      sitemapIdentityCollisionRows,
      existingSeedIdentityMatches,
      observedNetNewSitemapIdentityCapacity: netNewIdentities.length,
      capacityInterpretation,
      digestSha256: digest(netNewIdentities),
    },
    pathSignals: summarizePathSignals(sitemap.urls),
    massScore,
    recommendation: massRecommendation(massScore, netNewIdentities.length),
  };
}

async function main(): Promise<void> {
  const observedAt = new Date();
  const results: SourceResult[] = [];

  for (const domain of DATA_4_9A_CANDIDATES) {
    results.push(await qualifySource(domain, observedAt));
  }

  const ranked = results
    .filter((row) => row.status === "QUALIFIED_CAPACITY")
    .sort((a, b) => b.massScore - a.massScore
      || b.identity.observedNetNewSitemapIdentityCapacity - a.identity.observedNetNewSitemapIdentityCapacity
      || a.sourceDomain.localeCompare(b.sourceDomain));

  const proof = {
    schemaVersion: "data-4-9a-mass-source-onboarding-qualification-v1",
    lot: "DATA-4.9A",
    mode: "READ_ONLY",
    observedAt: observedAt.toISOString(),
    responsibility: "Measure current declared-sitemap capacity for new source onboarding candidates without authorizing display, fetching detail pages, or mutating production.",
    candidateCount: DATA_4_9A_CANDIDATES.length,
    candidateDomains: [...DATA_4_9A_CANDIDATES],
    excludedCriticalPathDomains: ["promoimmomarrakech.com"],
    qualifiedSourceCount: ranked.length,
    blockedSourceCount: results.length - ranked.length,
    completeObservedNetNewSitemapIdentityUpperBound: ranked
      .filter((row) => row.identity.capacityInterpretation === "complete_upper_bound")
      .reduce((sum, row) => sum + row.identity.observedNetNewSitemapIdentityCapacity, 0),
    truncatedObservedNetNewSitemapIdentityLowerBound: ranked
      .filter((row) => row.identity.capacityInterpretation === "observed_lower_bound")
      .reduce((sum, row) => sum + row.identity.observedNetNewSitemapIdentityCapacity, 0),
    highMassCandidateCount: ranked.filter((row) => row.recommendation === "HIGH_MASS_ONBOARDING_CANDIDATE").length,
    mediumMassCandidateCount: ranked.filter((row) => row.recommendation === "MEDIUM_MASS_ONBOARDING_CANDIDATE").length,
    databaseWrites: 0,
    registryWrites: 0,
    policyChanges: 0,
    publicDisplayActivations: 0,
    detailPageFetches: 0,
    nextDecision: "Use the highest-capacity sources only as inputs to a separate structural-pattern + legal/policy onboarding review before any public activation or write.",
    results,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), JSON.stringify(proof, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "ranking.json"), JSON.stringify(ranked, null, 2) + "\n"),
  ]);

  console.log(JSON.stringify({
    candidateCount: proof.candidateCount,
    qualifiedSourceCount: proof.qualifiedSourceCount,
    blockedSourceCount: proof.blockedSourceCount,
    completeUpperBound: proof.completeObservedNetNewSitemapIdentityUpperBound,
    truncatedLowerBound: proof.truncatedObservedNetNewSitemapIdentityLowerBound,
    highMassCandidateCount: proof.highMassCandidateCount,
    mediumMassCandidateCount: proof.mediumMassCandidateCount,
    ranking: ranked.map((row) => ({
      sourceDomain: row.sourceDomain,
      score: row.massScore,
      recommendation: row.recommendation,
      capacity: row.identity.observedNetNewSitemapIdentityCapacity,
      interpretation: row.identity.capacityInterpretation,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

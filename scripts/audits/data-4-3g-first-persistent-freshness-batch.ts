import fs from "node:fs/promises";
import path from "node:path";
import { extractRobotsSitemaps, parseSitemapXml, sameDarAgadirOrigin } from "../data4/daragadir-sitemap-revalidation";
import { classifyFreshnessShadowRows, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../data4/daragadir-freshness-shadow";
import { PROMOTION_CHANNEL, PROMOTION_TTL_DAYS, evaluatePromotionBoundary, type PromotionSnapshot } from "../data4/daragadir-controlled-promotion";
import { PERSISTENT_BATCH_RUN_ID, PERSISTENT_BATCH_SIZE, buildPersistentBatchPlan, selectPersistentBatch } from "../data4/daragadir-first-persistent-batch";

const outDir = process.env.DATA_4_3G_OUT_DIR ?? ".tmp/data-4-3g/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
const LOOKUP_CHUNK_SIZE = 10;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3G requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const apiKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    headers: { apikey: apiKey, authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed: ${response.status} ${await response.text()}`);
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

function postgrestIn(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}

async function fetchAllowedText(urlString: string): Promise<string> {
  if (!sameDarAgadirOrigin(urlString)) throw new Error(`Disallowed URL ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("Request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+persistent-freshness-batch-dry-run; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok || !sameDarAgadirOrigin(response.url)) throw new Error(`Source read failed ${response.status}: ${urlString}`);
  return response.text();
}

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string;
  discovery_policy: string;
  display_policy: string;
  display_gate: string;
  machine_gate: string;
  allowed_discovery_channels: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

type NormalizedRow = {
  canonical_url: string;
  normalization_status: string;
  freshness_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
};

type DisplayRow = { canonical_url: string; display_eligibility: string; quality_score: number | string | null };
type SeedDbRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_last_seen_at: string | null;
  fresh_channels: string[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};
type UrlRow = { canonical_url: string };

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function loadSeedStates(canonicalUrls: string[]): Promise<SeedDbRow[]> {
  const rows: SeedDbRow[] = [];
  for (let offset = 0; offset < canonicalUrls.length; offset += LOOKUP_CHUNK_SIZE) {
    const chunk = canonicalUrls.slice(offset, offset + LOOKUP_CHUNK_SIZE);
    rows.push(...await restPage<SeedDbRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
      canonical_url: postgrestIn(chunk),
      limit: String(chunk.length),
    }));
  }
  return rows;
}

async function loadUrlPresence(table: string, canonicalUrls: string[]): Promise<Set<string>> {
  const present = new Set<string>();
  for (let offset = 0; offset < canonicalUrls.length; offset += LOOKUP_CHUNK_SIZE) {
    const chunk = canonicalUrls.slice(offset, offset + LOOKUP_CHUNK_SIZE);
    const rows = await restPage<UrlRow>(table, {
      select: "canonical_url",
      canonical_url: postgrestIn(chunk),
      limit: String(chunk.length),
    });
    for (const row of rows) present.add(row.canonical_url);
  }
  return present;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, normalized, display] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
      order: "source_domain.asc",
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,normalization_status,freshness_status,city,property_type,intent",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,display_eligibility,quality_score",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
  ]);

  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;
  const policy: FreshnessShadowPolicy = {
    sourceDomain: registry.source_domain,
    acquisitionMode: registry.acquisition_mode,
    discoveryPolicy: registry.discovery_policy,
    displayPolicy: registry.display_policy,
    displayGate: registry.display_gate,
    machineGate: registry.machine_gate,
    allowedDiscoveryChannels: registry.allowed_discovery_channels ?? [],
    maxRevalidationIntervalDays: registry.max_revalidation_interval_days,
    reviewStatus: registry.review_status,
  };
  if (!policyAllowsFreshnessShadow(policy)) throw new Error(`Registry boundary mismatch: ${JSON.stringify(policy)}`);
  if (policy.maxRevalidationIntervalDays !== PROMOTION_TTL_DAYS) throw new Error("TTL must match Registry revalidation interval");

  const robots = await fetchAllowedText("https://daragadir.com/robots.txt");
  const queue = [...extractRobotsSitemaps(robots)];
  if (!queue.length) throw new Error("No sitemap declared");
  const visited = new Set<string>();
  const sitemapByCanonicalUrl = new Map<string, string>();
  while (queue.length) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`Unknown sitemap ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) sitemapByCanonicalUrl.set(canonicalUrl, sitemapUrl);
    }
  }

  const displayByUrl = new Map(display.map((row) => [row.canonical_url, row]));
  const candidates: FreshnessShadowCandidate[] = normalized.map((row) => {
    const displayRow = displayByUrl.get(row.canonical_url);
    return {
      canonicalUrl: row.canonical_url,
      normalizationStatus: row.normalization_status,
      freshnessStatus: row.freshness_status,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      qualityScore: displayRow ? numberOrNull(displayRow.quality_score) : null,
      displayEligibility: displayRow?.display_eligibility ?? null,
    };
  });

  const shadow = classifyFreshnessShadowRows(candidates, policy, new Set(sitemapByCanonicalUrl.keys()));
  const eligibleSeedOnly = shadow.filter((row) => row.classification === "SHADOW_READY" && row.freshnessStatus === "seed_only");
  const decision = evaluatePromotionBoundary({
    registryEligible: true,
    registryReviewStatus: policy.reviewStatus,
    sitemapSignalPresent: true,
    requestedBatchSize: PERSISTENT_BATCH_SIZE,
    cumulativeAppliedRows: 0,
    candidateRows: eligibleSeedOnly.length,
    driftedRows: 0,
  });
  if (!decision.allowed || decision.effectiveBatchSize !== PERSISTENT_BATCH_SIZE) throw new Error(`Promotion boundary rejected: ${JSON.stringify(decision)}`);

  const selected = selectPersistentBatch(eligibleSeedOnly);
  if (selected.length !== PERSISTENT_BATCH_SIZE) throw new Error(`Expected ${PERSISTENT_BATCH_SIZE} rows, got ${selected.length}`);
  const urls = selected.map((row) => row.canonicalUrl);
  const [seeds, publicPresence] = await Promise.all([
    loadSeedStates(urls),
    loadUrlPresence("public_search_representations_v1", urls),
  ]);
  if (seeds.length !== PERSISTENT_BATCH_SIZE) throw new Error(`Expected ${PERSISTENT_BATCH_SIZE} seed states, got ${seeds.length}`);
  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url, row]));

  const manifest = selected.map((candidate) => {
    const seed = seedByUrl.get(candidate.canonicalUrl);
    if (!seed) throw new Error(`Missing seed state for ${candidate.canonicalUrl}`);
    if ((seed.fresh_channels ?? []).includes(PROMOTION_CHANNEL)) throw new Error(`Promotion channel already present: ${candidate.canonicalUrl}`);
    const sitemapUrl = sitemapByCanonicalUrl.get(candidate.canonicalUrl);
    if (!sitemapUrl) throw new Error(`Missing sitemap evidence for ${candidate.canonicalUrl}`);
    const before: PromotionSnapshot = {
      canonicalUrl: seed.canonical_url,
      freshnessStatus: seed.freshness_status,
      freshLastSeenAt: seed.fresh_last_seen_at,
      freshChannels: seed.fresh_channels ?? [],
      metadata: seed.metadata,
      updatedAt: seed.updated_at,
    };
    return buildPersistentBatchPlan(before, {
      canonicalUrl: candidate.canonicalUrl,
      observedAt: generatedAt,
      sitemapUrl,
    });
  });

  const proof = {
    schemaVersion: "data-4-3g-first-persistent-freshness-batch-v1",
    generatedAt,
    mode: "DRY_RUN",
    runId: PERSISTENT_BATCH_RUN_ID,
    batchSize: manifest.length,
    eligibleSeedOnlyRows: eligibleSeedOnly.length,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    seedStateReads: seeds.length,
    beforePublicSearchRows: publicPresence.size,
    beforeTechnicalDisplayRows: selected.filter((row) => displayByUrl.has(row.canonicalUrl)).length,
    databaseWrites: 0,
    freshnessWrites: 0,
    policyChanges: 0,
    displayPolicyChanges: 0,
    productionActivation: false,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    rollbackRows: manifest.length,
    registryReviewStatus: policy.reviewStatus,
    ttlDays: PROMOTION_TTL_DAYS,
    promotionDecision: decision,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "apply-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "rollback-manifest.json"), `${JSON.stringify(manifest.map((row) => ({ canonicalUrl: row.canonicalUrl, ...row.rollback })), null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

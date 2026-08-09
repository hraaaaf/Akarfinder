import fs from "node:fs/promises";
import path from "node:path";
import {
  extractRobotsSitemaps,
  policyAllowsSitemapRevalidation,
  type DarAgadirRevalidationPolicy,
} from "../data4/daragadir-sitemap-revalidation";

const OUT_DIR = process.env.DATA_4_6A_OUT_DIR ?? ".tmp/data-4-6a/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_SOURCE_REQUESTS = 2;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.6A requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
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

async function fetchRobots(url: string): Promise<string> {
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.6A source request budget exceeded");
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.6A; robots/sitemap-policy-audit; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DATA-4.6A robots read failed ${response.status}`);
  const final = new URL(response.url);
  if (final.protocol !== "https:" || !["daragadir.com", "www.daragadir.com"].includes(final.hostname)) {
    throw new Error(`DATA-4.6A robots redirect left allowed origin: ${response.url}`);
  }
  return response.text();
}

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string;
  discovery_policy: string;
  display_policy: string;
  display_gate: string;
  allowed_discovery_channels: string[] | null;
  robots_status: string;
  evidence_urls: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

type SeedRow = { canonical_url: string; freshness_status: string; fresh_channels: string[] | null };

type CountRow = { canonical_url: string };

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, seeds, normalized, display, publicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,evidence_urls,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_channels",
      source_domain: "eq.daragadir.com",
    }),
    restAll<CountRow>("thin_index_normalized_documents_v2", { select: "canonical_url", source_domain: "eq.daragadir.com" }),
    restAll<CountRow>("thin_index_display_eligible_v1", { select: "canonical_url", source_domain: "eq.daragadir.com" }),
    restAll<CountRow>("public_search_representations_v1", { select: "canonical_url", source_domain: "eq.daragadir.com" }),
  ]);

  if (registryRows.length !== 1) throw new Error(`DATA-4.6A expected one Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;
  const policy: DarAgadirRevalidationPolicy = {
    sourceDomain: registry.source_domain,
    acquisitionMode: registry.acquisition_mode,
    discoveryPolicy: registry.discovery_policy,
    displayPolicy: registry.display_policy,
    displayGate: registry.display_gate,
    allowedDiscoveryChannels: registry.allowed_discovery_channels ?? [],
    robotsStatus: registry.robots_status,
    evidenceUrls: registry.evidence_urls ?? [],
    maxRevalidationIntervalDays: registry.max_revalidation_interval_days,
    reviewStatus: registry.review_status,
  };
  if (!policyAllowsSitemapRevalidation(policy)) throw new Error(`DATA-4.6A Registry gate failed: ${JSON.stringify(policy)}`);

  const robotsUrl = "https://daragadir.com/robots.txt";
  const robotsText = await fetchRobots(robotsUrl);
  const declaredSitemaps = extractRobotsSitemaps(robotsText);
  const sourceDeclarationMatchesRegistry = declaredSitemaps.length > 0;

  const proof = {
    schemaVersion: "data-4-6a-daragadir-mass-expansion-qualification-v1",
    generatedAt,
    mode: "READ_ONLY_QUALIFICATION",
    verdict: sourceDeclarationMatchesRegistry ? "SITEMAP_DECLARATION_PRESENT_REQUIRES_SEPARATE_EXPANSION_REPLAY" : "SOURCE_SITEMAP_DECLARATION_DRIFT",
    sourceDomain: "daragadir.com",
    registryReviewStatus: policy.reviewStatus,
    registryRobotsStatus: policy.robotsStatus,
    robotsUrl,
    declaredSitemaps,
    sourceDeclarationMatchesRegistry,
    totalSeeds: seeds.length,
    alreadyFreshConfirmed: seeds.filter((row) => row.freshness_status === "fresh_confirmed").length,
    seedOnlyRows: seeds.filter((row) => row.freshness_status === "seed_only").length,
    sitemapOwnedFreshConfirmed: seeds.filter((row) => row.freshness_status === "fresh_confirmed" && (row.fresh_channels ?? []).includes("public_sitemap_presence")).length,
    normalizedRows: normalized.length,
    technicalDisplayRows: display.length,
    publicSearchRows: publicRows.length,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    databaseWrites: 0,
    freshnessWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
    productionActivation: false,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    writeAuthorized: false,
    suggestedNextCheckpoint: 0,
    nextLot: sourceDeclarationMatchesRegistry ? "DATA-4.6B_DARAGADIR_EXPANSION_REPLAY" : "ROTATE_TO_NEXT_PUBLIC_SITEMAP_RESERVOIR",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

import fs from "node:fs/promises";
import path from "node:path";
import { extractRobotsSitemaps, parseSitemapXml, sameDarAgadirOrigin } from "../data4/daragadir-sitemap-revalidation";
import { classifyFreshnessShadowRows, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../data4/daragadir-freshness-shadow";

const outDir = process.env.DATA_4_3C_OUT_DIR ?? ".tmp/data-4-3c/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3C requires ${name}`);
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

async function fetchAllowedText(urlString: string): Promise<string> {
  if (!sameDarAgadirOrigin(urlString)) throw new Error(`Disallowed URL ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("Request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+freshness-shadow; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameDarAgadirOrigin(response.url) || !response.ok) throw new Error(`Source read failed ${response.status}: ${urlString}`);
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

type DisplayRow = {
  canonical_url: string;
  display_eligibility: string;
  quality_score: number | string | null;
};

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function main(): Promise<void> {
  const [registry, normalized, display] = await Promise.all([
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

  if (registry.length !== 1) throw new Error(`Expected one Registry row, got ${registry.length}`);
  const registryRow = registry[0]!;
  const policy: FreshnessShadowPolicy = {
    sourceDomain: registryRow.source_domain,
    acquisitionMode: registryRow.acquisition_mode,
    discoveryPolicy: registryRow.discovery_policy,
    displayPolicy: registryRow.display_policy,
    displayGate: registryRow.display_gate,
    machineGate: registryRow.machine_gate,
    allowedDiscoveryChannels: registryRow.allowed_discovery_channels ?? [],
    maxRevalidationIntervalDays: registryRow.max_revalidation_interval_days,
    reviewStatus: registryRow.review_status,
  };
  if (!policyAllowsFreshnessShadow(policy)) throw new Error(`Registry boundary mismatch: ${JSON.stringify(policy)}`);

  const robots = await fetchAllowedText("https://daragadir.com/robots.txt");
  const rootSitemaps = extractRobotsSitemaps(robots);
  if (!rootSitemaps.length) throw new Error("No sitemap declared");

  const queue = [...rootSitemaps];
  const visited = new Set<string>();
  const sitemapUrls = new Set<string>();
  while (queue.length) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`Unknown sitemap ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) {
        if (!visited.has(child) && !queue.includes(child)) queue.push(child);
      }
    } else {
      for (const loc of parsed.locs) sitemapUrls.add(loc);
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

  const results = classifyFreshnessShadowRows(candidates, policy, sitemapUrls);
  const counts: Record<string, number> = {};
  for (const result of results) counts[result.classification] = (counts[result.classification] ?? 0) + 1;
  const seedOnlyShadowReadyRows = results.filter((result) => result.freshnessStatus === "seed_only" && result.classification === "SHADOW_READY").length;

  const proof = {
    schemaVersion: "data-4-3c-daragadir-freshness-shadow-v1",
    generatedAt: new Date().toISOString(),
    databaseWrites: 0,
    freshnessWrites: 0,
    policyChanges: 0,
    productionActivation: false,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    sitemapUrlsObserved: sitemapUrls.size,
    rowsRead: normalized.length,
    registryReviewStatus: policy.reviewStatus,
    maxRevalidationIntervalDays: policy.maxRevalidationIntervalDays,
    counts,
    shadowReadyRows: counts.SHADOW_READY ?? 0,
    seedOnlyShadowReadyRows,
    policyBlockedRows: counts.POLICY_BLOCKED ?? 0,
    duplicateRows: counts.DUPLICATE ?? 0,
  };

  const csv = [
    "canonical_url,classification,freshness_status,normalization_status,city,property_type,intent,quality_score,display_eligibility",
    ...results.map((result) => [
      result.canonicalUrl,
      result.classification,
      result.freshnessStatus,
      result.normalizationStatus,
      result.city ?? "",
      result.propertyType ?? "",
      result.intent ?? "",
      result.qualityScore ?? "",
      result.displayEligibility ?? "",
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
  ].join("\n");

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ proof, policy, counts }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "classification.csv"), `${csv}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

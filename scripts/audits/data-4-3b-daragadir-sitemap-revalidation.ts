import fs from "node:fs/promises";
import path from "node:path";
import {
  compareExistingToSitemap,
  extractRobotsSitemaps,
  parseSitemapXml,
  policyAllowsSitemapRevalidation,
  sameDarAgadirOrigin,
  type DarAgadirRevalidationPolicy,
  type ExistingDarAgadirRow,
} from "../data4/daragadir-sitemap-revalidation";

const outDir = process.env.DATA_4_3B_OUT_DIR ?? ".tmp/data-4-3b/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
const MAX_SITEMAP_URLS = 50000;

let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3B requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    method: "GET",
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed: HTTP ${response.status} ${await response.text()}`);
  return (await response.json()) as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function fetchAllowedText(urlString: string): Promise<{ finalUrl: string; text: string; status: number }> {
  if (!sameDarAgadirOrigin(urlString)) throw new Error(`Disallowed source URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error(`Source request budget exceeded: ${sourceRequests}`);
  const response = await fetch(urlString, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+public-sitemap-revalidation; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameDarAgadirOrigin(response.url)) throw new Error(`Cross-origin redirect blocked: ${response.url}`);
  if (!response.ok) throw new Error(`Source read failed ${response.status}: ${urlString}`);
  return { finalUrl: response.url, text: await response.text(), status: response.status };
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

type NormalizedRow = {
  canonical_url: string;
  freshness_status: string;
  normalization_status: string;
};

async function main(): Promise<void> {
  const [registryRows, existingRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,evidence_urls,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
      order: "source_domain.asc",
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,freshness_status,normalization_status",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
  ]);

  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);
  const r = registryRows[0]!;
  const policy: DarAgadirRevalidationPolicy = {
    sourceDomain: r.source_domain,
    acquisitionMode: r.acquisition_mode,
    discoveryPolicy: r.discovery_policy,
    displayPolicy: r.display_policy,
    displayGate: r.display_gate,
    allowedDiscoveryChannels: r.allowed_discovery_channels ?? [],
    robotsStatus: r.robots_status,
    evidenceUrls: r.evidence_urls ?? [],
    maxRevalidationIntervalDays: r.max_revalidation_interval_days,
    reviewStatus: r.review_status,
  };
  if (!policyAllowsSitemapRevalidation(policy)) throw new Error(`Registry does not allow DATA-4.3B: ${JSON.stringify(policy)}`);

  const robotsUrl = "https://daragadir.com/robots.txt";
  const robots = await fetchAllowedText(robotsUrl);
  const rootSitemaps = extractRobotsSitemaps(robots.text);
  if (rootSitemaps.length === 0) throw new Error("No same-origin https Sitemap declaration found in robots.txt");

  const queue = [...rootSitemaps];
  const visitedSitemaps = new Set<string>();
  const sitemapUrls = new Set<string>();

  while (queue.length) {
    const sitemapUrl = queue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);
    const fetched = await fetchAllowedText(sitemapUrl);
    const parsed = parseSitemapXml(fetched.text);
    if (parsed.kind === "unknown") throw new Error(`Unknown sitemap XML shape: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) {
        if (!visitedSitemaps.has(child) && !queue.includes(child)) queue.push(child);
      }
    } else {
      for (const loc of parsed.locs) {
        sitemapUrls.add(loc);
        if (sitemapUrls.size > MAX_SITEMAP_URLS) throw new Error(`Sitemap URL ceiling exceeded: ${sitemapUrls.size}`);
      }
    }
  }

  const existing: ExistingDarAgadirRow[] = existingRows.map((row) => ({
    canonicalUrl: row.canonical_url,
    freshnessStatus: row.freshness_status,
    normalizationStatus: row.normalization_status,
  }));
  const comparison = compareExistingToSitemap(existing, sitemapUrls);

  const proof = {
    schemaVersion: "data-4-3b-daragadir-sitemap-revalidation-v1",
    generatedAt: new Date().toISOString(),
    databaseWrites: 0,
    policyChanges: 0,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    freshnessWrites: 0,
    productionActivation: false,
    sourceDomain: "daragadir.com",
    registryReviewStatus: policy.reviewStatus,
    maxRevalidationIntervalDays: policy.maxRevalidationIntervalDays,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    robotsUrl,
    rootSitemaps,
    sitemapDocumentsRead: visitedSitemaps.size,
    sitemapUrlsObserved: sitemapUrls.size,
    ...comparison,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ proof, policy }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "sitemap-urls.txt"), `${[...sitemapUrls].sort().join("\n")}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs/promises";
import path from "node:path";
import {
  extractRobotsSitemaps,
  parseSitemapXml,
  policyAllowsSitemapRevalidation,
  sameDarAgadirOrigin,
  type DarAgadirRevalidationPolicy,
} from "../data4/daragadir-sitemap-revalidation";

const OUT_DIR = process.env.DATA_4_6A_OUT_DIR ?? ".tmp/data-4-6a/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_SOURCE_REQUESTS = 40;
const MAX_SITEMAP_URLS = 50_000;
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

async function fetchAllowedText(urlString: string): Promise<string> {
  if (!sameDarAgadirOrigin(urlString)) throw new Error(`DATA-4.6A disallowed source URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.6A source request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.6A; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameDarAgadirOrigin(response.url)) throw new Error(`DATA-4.6A redirect left allowed origin: ${response.url}`);
  if (!response.ok) throw new Error(`DATA-4.6A source read failed ${response.status}: ${urlString}`);
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

type SeedRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_channels: string[] | null;
};

type NormalizedRow = {
  canonical_url: string;
  normalization_status: string;
  freshness_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
  title: string | null;
  price_mad: number | string | null;
  surface_m2: number | string | null;
};

type DisplayRow = {
  canonical_url: string;
  quality_tier: string | null;
  quality_score: number | string | null;
  display_eligibility: string | null;
};

type PublicRow = { canonical_url: string; source_domain: string };

function isConservativeCandidate(row: NormalizedRow, display: DisplayRow | undefined): boolean {
  if (row.normalization_status !== "normalized") return false;
  if (row.freshness_status !== "seed_only") return false;
  if (!row.city || !row.property_type || !row.intent || !row.title) return false;
  if (row.price_mad === null || row.surface_m2 === null) return false;
  if (!display) return false;
  if (!["A", "B"].includes(display.quality_tier ?? "")) return false;
  return true;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, seeds, normalizedRows, displayRows, publicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,evidence_urls,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_channels",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,normalization_status,freshness_status,city,property_type,intent,title,price_mad,surface_m2",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,quality_tier,quality_score,display_eligibility",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url,source_domain",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
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

  const robots = await fetchAllowedText("https://daragadir.com/robots.txt");
  const queue = [...extractRobotsSitemaps(robots)];
  if (queue.length === 0) throw new Error("DATA-4.6A robots declares no same-origin sitemap");
  const visited = new Set<string>();
  const sitemapUrls = new Set<string>();

  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.6A unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) {
        sitemapUrls.add(canonicalUrl);
        if (sitemapUrls.size > MAX_SITEMAP_URLS) throw new Error(`DATA-4.6A sitemap URL ceiling exceeded: ${sitemapUrls.size}`);
      }
    }
  }

  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url, row]));
  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));

  const normalizedInSitemap = normalizedRows.filter((row) => sitemapUrls.has(row.canonical_url));
  const seedOnlyInSitemap = normalizedInSitemap.filter((row) => seedByUrl.get(row.canonical_url)?.freshness_status === "seed_only");
  const conservative = seedOnlyInSitemap.filter((row) => isConservativeCandidate(row, displayByUrl.get(row.canonical_url)));
  const conservativePublic = conservative.filter((row) => publicSet.has(row.canonical_url));
  const alreadyFresh = seeds.filter((row) => row.freshness_status === "fresh_confirmed").length;
  const sitemapOwnedFresh = seeds.filter((row) => row.freshness_status === "fresh_confirmed" && (row.fresh_channels ?? []).includes("public_sitemap_presence")).length;

  const proof = {
    schemaVersion: "data-4-6a-daragadir-mass-expansion-qualification-v1",
    generatedAt,
    mode: "READ_ONLY_QUALIFICATION",
    sourceDomain: "daragadir.com",
    registryReviewStatus: policy.reviewStatus,
    databaseWrites: 0,
    freshnessWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
    productionActivation: false,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    sitemapDocumentsRead: visited.size,
    currentSitemapUrlCount: sitemapUrls.size,
    totalSeeds: seeds.length,
    alreadyFreshConfirmed: alreadyFresh,
    sitemapOwnedFreshConfirmed: sitemapOwnedFresh,
    seedOnlyRows: seeds.filter((row) => row.freshness_status === "seed_only").length,
    normalizedRows: normalizedRows.length,
    normalizedInCurrentSitemap: normalizedInSitemap.length,
    seedOnlyInCurrentSitemap: seedOnlyInSitemap.length,
    conservativeCandidates: conservative.length,
    conservativeCandidatesInPublicSearch: conservativePublic.length,
    technicalDisplayRows: displayRows.length,
    publicSearchRows: publicRows.length,
    suggestedNextCheckpoint: conservativePublic.length >= 2000 ? 1000 : conservativePublic.length >= 1000 ? 500 : conservativePublic.length >= 500 ? 250 : Math.min(100, conservativePublic.length),
    writeAuthorized: false,
    nextLot: "DATA-4.6B_DARAGADIR_MASS_EXPANSION_WRITE_DESIGN",
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "candidate-urls.txt"), `${conservativePublic.map((row) => row.canonical_url).sort().join("\n")}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

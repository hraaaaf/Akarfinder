import fs from "node:fs/promises";
import path from "node:path";

const DOMAIN = "limmobiliersansfrontieres.com";
const OUT_DIR = process.env.DATA_4_7A_OUT_DIR ?? ".tmp/data-4-7a/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_SOURCE_REQUESTS = 40;
const MAX_SITEMAP_URLS = 50_000;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.7A requires ${name}`);
  return value;
}

function sameOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && [DOMAIN, `www.${DOMAIN}`].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function conservativeUrlIdentity(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (!sameOrigin(urlString)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname).normalize("NFC");
    } catch {
      pathname = url.pathname;
    }
    pathname = pathname.replace(/\/+$/, "") || "/";
    return `https://${host}${pathname}${url.search}`;
  } catch {
    return null;
  }
}

function groupByIdentity<T>(rows: T[], getUrl: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = conservativeUrlIdentity(getUrl(row));
    if (!key) continue;
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
}

function extractRobotsSitemaps(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && sameOrigin(match[1])) out.add(match[1]);
  }
  return [...out].sort();
}

function parseSitemapXml(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&").trim())
    .filter(sameOrigin);
  return { kind, locs: [...new Set(locs)].sort() };
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

async function fetchSourceText(urlString: string): Promise<string> {
  if (!sameOrigin(urlString)) throw new Error(`DATA-4.7A disallowed source URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.7A source request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.7A; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOrigin(response.url)) throw new Error(`DATA-4.7A redirect left allowed origin: ${response.url}`);
  if (!response.ok) throw new Error(`DATA-4.7A source read failed ${response.status}: ${urlString}`);
  return response.text();
}

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string | null;
  discovery_policy: string | null;
  display_policy: string | null;
  display_gate: string | null;
  allowed_discovery_channels: string[] | null;
  robots_status: string | null;
  evidence_urls: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

type SeedRow = { canonical_url: string; freshness_status: string; fresh_channels: string[] | null };
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
type DisplayRow = { canonical_url: string; quality_tier: string | null; display_eligibility: string | null };
type PublicRow = { canonical_url: string };

function registryAllows(policy: RegistryRow): boolean {
  return policy.source_domain === DOMAIN
    && policy.acquisition_mode === "public_sitemap_canonical_link"
    && policy.discovery_policy === "public_sitemap_only"
    && policy.display_policy === "canonical_link_only"
    && policy.display_gate === "external_tail_link_only"
    && (policy.allowed_discovery_channels ?? []).includes("public_sitemap")
    && policy.robots_status === "sitemap_declared"
    && policy.max_revalidation_interval_days === 14
    && ["current", "due_soon"].includes(policy.review_status ?? "")
    && (policy.evidence_urls ?? []).includes(`https://${DOMAIN}/robots.txt`);
}

function conservativeCandidate(row: NormalizedRow, display: DisplayRow | undefined): boolean {
  return row.normalization_status === "normalized"
    && row.freshness_status === "seed_only"
    && !!row.city && !!row.property_type && !!row.intent && !!row.title
    && row.price_mad !== null && row.surface_m2 !== null
    && !!display
    && ["A", "B"].includes(display.quality_tier ?? "");
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, seeds, normalized, displayRows, publicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,evidence_urls,max_revalidation_interval_days,review_status",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<SeedRow>("source_offer_seeds", { select: "canonical_url,freshness_status,fresh_channels", source_domain: `eq.${DOMAIN}` }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", { select: "canonical_url,normalization_status,freshness_status,city,property_type,intent,title,price_mad,surface_m2", source_domain: `eq.${DOMAIN}` }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", { select: "canonical_url,quality_tier,display_eligibility", source_domain: `eq.${DOMAIN}` }),
    restAll<PublicRow>("public_search_representations_v1", { select: "canonical_url", source_domain: `eq.${DOMAIN}` }),
  ]);

  if (registryRows.length !== 1) throw new Error(`DATA-4.7A expected one Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;
  if (!registryAllows(registry)) throw new Error(`DATA-4.7A Registry gate failed: ${JSON.stringify(registry)}`);

  const robotsUrl = `https://${DOMAIN}/robots.txt`;
  const robotsText = await fetchSourceText(robotsUrl);
  const rootSitemaps = extractRobotsSitemaps(robotsText);
  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));
  const seedSet = new Map(seeds.map((row) => [row.canonical_url, row]));

  if (rootSitemaps.length === 0) {
    const proof = {
      schemaVersion: "data-4-7a-lsf-sitemap-mass-qualification-v1",
      generatedAt,
      mode: "READ_ONLY_QUALIFICATION",
      verdict: "SOURCE_SITEMAP_DECLARATION_DRIFT",
      sourceDomain: DOMAIN,
      totalSeeds: seeds.length,
      alreadyFreshConfirmed: seeds.filter((row) => row.freshness_status === "fresh_confirmed").length,
      seedOnlyRows: seeds.filter((row) => row.freshness_status === "seed_only").length,
      normalizedRows: normalized.length,
      technicalDisplayRows: displayRows.length,
      publicSearchRows: publicRows.length,
      rootSitemaps,
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
      nextLot: "ROTATE_TO_NEXT_PUBLIC_SITEMAP_RESERVOIR",
    };
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  const queue = [...rootSitemaps];
  const visited = new Set<string>();
  const sitemapUrls = new Set<string>();
  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchSourceText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.7A unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) {
        sitemapUrls.add(canonicalUrl);
        if (sitemapUrls.size > MAX_SITEMAP_URLS) throw new Error(`DATA-4.7A sitemap URL ceiling exceeded: ${sitemapUrls.size}`);
      }
    }
  }

  const exactUrlMatches = normalized.filter((row) => sitemapUrls.has(row.canonical_url)).length;
  const normalizedByIdentity = groupByIdentity(normalized, (row) => row.canonical_url);
  const sitemapByIdentity = groupByIdentity([...sitemapUrls], (url) => url);
  const dbIdentityCollisions = [...normalizedByIdentity.values()].filter((rows) => rows.length !== 1).length;
  const sitemapIdentityCollisions = [...sitemapByIdentity.values()].filter((rows) => rows.length !== 1).length;
  const safeIdentityKeys = new Set(
    [...normalizedByIdentity.entries()]
      .filter(([key, rows]) => rows.length === 1 && sitemapByIdentity.get(key)?.length === 1)
      .map(([key]) => key),
  );

  const normalizedInSitemap = normalized.filter((row) => {
    const key = conservativeUrlIdentity(row.canonical_url);
    return key !== null && safeIdentityKeys.has(key);
  });
  const seedOnlyInSitemap = normalizedInSitemap.filter((row) => seedSet.get(row.canonical_url)?.freshness_status === "seed_only");
  const conservative = seedOnlyInSitemap.filter((row) => conservativeCandidate(row, displayByUrl.get(row.canonical_url)));
  const conservativePublic = conservative.filter((row) => publicSet.has(row.canonical_url));
  const checkpoint = conservativePublic.length >= 1000 ? 500 : conservativePublic.length >= 500 ? 250 : conservativePublic.length >= 200 ? 100 : Math.min(50, conservativePublic.length);

  const proof = {
    schemaVersion: "data-4-7a-lsf-sitemap-mass-qualification-v1",
    generatedAt,
    mode: "READ_ONLY_QUALIFICATION",
    verdict: conservativePublic.length >= 100 ? "QUALIFIED_FOR_CONTROLLED_EXPANSION_DESIGN" : "INSUFFICIENT_CONSERVATIVE_LIVE_RESERVOIR",
    sourceDomain: DOMAIN,
    totalSeeds: seeds.length,
    alreadyFreshConfirmed: seeds.filter((row) => row.freshness_status === "fresh_confirmed").length,
    seedOnlyRows: seeds.filter((row) => row.freshness_status === "seed_only").length,
    normalizedRows: normalized.length,
    technicalDisplayRows: displayRows.length,
    publicSearchRows: publicRows.length,
    rootSitemaps,
    sitemapDocumentsRead: visited.size,
    currentSitemapUrlCount: sitemapUrls.size,
    exactUrlMatches,
    dbIdentityCollisions,
    sitemapIdentityCollisions,
    safeIdentityMatches: normalizedInSitemap.length,
    normalizedInCurrentSitemap: normalizedInSitemap.length,
    seedOnlyInCurrentSitemap: seedOnlyInSitemap.length,
    conservativeCandidates: conservative.length,
    conservativeCandidatesInPublicSearch: conservativePublic.length,
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
    suggestedNextCheckpoint: checkpoint,
    nextLot: conservativePublic.length >= 100 ? "DATA-4.7B_LSF_CONTROLLED_EXPANSION_WRITE" : "ROTATE_TO_NEXT_PUBLIC_SITEMAP_RESERVOIR",
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

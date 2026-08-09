import fs from "node:fs/promises";
import path from "node:path";

const SOURCES = ["limmobiliersansfrontieres.com", "aykana.ma"] as const;
type SourceDomain = typeof SOURCES[number];
const OUT_DIR = process.env.DATA_4_7C_OUT_DIR ?? ".tmp/data-4-7c/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_REQUESTS_PER_SOURCE = 40;
const MAX_SITEMAP_URLS_PER_SOURCE = 50_000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.7C requires ${name}`);
  return value;
}

function allowedHost(domain: SourceDomain, hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === domain || host === `www.${domain}`;
}

function sameOrigin(domain: SourceDomain, urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && allowedHost(domain, url.hostname);
  } catch {
    return false;
  }
}

function conservativeUrlIdentity(domain: SourceDomain, urlString: string): string | null {
  try {
    if (!sameOrigin(domain, urlString)) return null;
    const url = new URL(urlString);
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

function extractRobotsSitemaps(domain: SourceDomain, text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && sameOrigin(domain, match[1])) out.add(match[1]);
  }
  return [...out].sort();
}

function parseSitemapXml(domain: SourceDomain, xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&").trim())
    .filter((url) => sameOrigin(domain, url));
  return { kind, locs: [...new Set(locs)].sort() };
}

function authHeaders(): Record<string, string> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) });
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

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string | null;
  discovery_policy: string | null;
  display_policy: string | null;
  display_gate: string | null;
  allowed_discovery_channels: string[] | null;
  robots_status: string | null;
  review_status: string | null;
  next_review_at: string | null;
  max_revalidation_interval_days: number | null;
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
  title: string | null;
};

type DisplayRow = {
  canonical_url: string;
  display_eligibility: string | null;
  quality_tier: string | null;
  quality_score: number | string | null;
};

type PublicRow = { canonical_url: string };

function registryAllows(domain: SourceDomain, row: RegistryRow, now: Date): boolean {
  const nextReview = row.next_review_at ? new Date(row.next_review_at) : null;
  return row.source_domain === domain
    && row.acquisition_mode === "public_sitemap_canonical_link"
    && row.discovery_policy === "public_sitemap_only"
    && row.display_policy === "canonical_link_only"
    && row.display_gate === "external_tail_link_only"
    && (row.allowed_discovery_channels ?? []).includes("public_sitemap")
    && row.robots_status === "sitemap_declared"
    && ["current", "due_soon"].includes(row.review_status ?? "")
    && row.max_revalidation_interval_days === 14
    && nextReview instanceof Date
    && Number.isFinite(nextReview.getTime())
    && nextReview.getTime() > now.getTime();
}

async function fetchSourceText(domain: SourceDomain, urlString: string, counter: { value: number }): Promise<string> {
  if (!sameOrigin(domain, urlString)) throw new Error(`DATA-4.7C disallowed source URL: ${urlString}`);
  counter.value += 1;
  if (counter.value > MAX_REQUESTS_PER_SOURCE) throw new Error(`DATA-4.7C ${domain} source request budget exceeded`);
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.7C; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOrigin(domain, response.url)) throw new Error(`DATA-4.7C redirect left ${domain}: ${response.url}`);
  if (!response.ok) throw new Error(`DATA-4.7C ${domain} source read failed ${response.status}: ${urlString}`);
  return response.text();
}

async function readCurrentSitemap(domain: SourceDomain): Promise<{ urls: string[]; requests: number; roots: string[] }> {
  const counter = { value: 0 };
  const robots = await fetchSourceText(domain, `https://${domain}/robots.txt`, counter);
  const roots = extractRobotsSitemaps(domain, robots);
  if (roots.length === 0) throw new Error(`DATA-4.7C ${domain} robots declares no same-origin HTTPS sitemap`);
  const queue = [...roots];
  const visited = new Set<string>();
  const urls: string[] = [];
  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(domain, await fetchSourceText(domain, sitemapUrl, counter));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.7C ${domain} unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      urls.push(...parsed.locs);
      if (urls.length > MAX_SITEMAP_URLS_PER_SOURCE) throw new Error(`DATA-4.7C ${domain} sitemap ceiling exceeded`);
    }
  }
  return { urls: [...new Set(urls)].sort(), requests: counter.value, roots };
}

function numeric(value: number | string | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function qualify(domain: SourceDomain, observedAt: Date) {
  const [registryRows, seeds, normalized, displayRows, publicRows, sitemap] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,review_status,next_review_at,max_revalidation_interval_days",
      source_domain: `eq.${domain}`,
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_channels",
      source_domain: `eq.${domain}`,
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,normalization_status,freshness_status,title",
      source_domain: `eq.${domain}`,
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,display_eligibility,quality_tier,quality_score",
      source_domain: `eq.${domain}`,
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url",
      source_domain: `eq.${domain}`,
    }),
    readCurrentSitemap(domain),
  ]);

  if (registryRows.length !== 1 || !registryAllows(domain, registryRows[0]!, observedAt)) {
    throw new Error(`DATA-4.7C ${domain} Registry gate failed: ${JSON.stringify(registryRows)}`);
  }

  const dbIdentity = new Map<string, NormalizedRow[]>();
  for (const row of normalized) {
    const identity = conservativeUrlIdentity(domain, row.canonical_url);
    if (!identity) continue;
    const bucket = dbIdentity.get(identity) ?? [];
    bucket.push(row);
    dbIdentity.set(identity, bucket);
  }
  const sitemapIdentity = new Map<string, string[]>();
  for (const url of sitemap.urls) {
    const identity = conservativeUrlIdentity(domain, url);
    if (!identity) continue;
    const bucket = sitemapIdentity.get(identity) ?? [];
    bucket.push(url);
    sitemapIdentity.set(identity, bucket);
  }

  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));
  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url, row]));

  const preSitemap = normalized.filter((row) => {
    if (row.normalization_status !== "normalized" || row.freshness_status !== "seed_only") return false;
    if (!["eligible_primary", "eligible_secondary"].includes(displayByUrl.get(row.canonical_url)?.display_eligibility ?? "")) return false;
    return publicSet.has(row.canonical_url);
  });

  const candidates = preSitemap.filter((row) => {
    const identity = conservativeUrlIdentity(domain, row.canonical_url);
    return Boolean(identity && dbIdentity.get(identity!)?.length === 1 && sitemapIdentity.get(identity!)?.length === 1);
  }).sort((a, b) => {
    const da = displayByUrl.get(a.canonical_url);
    const db = displayByUrl.get(b.canonical_url);
    const quality = numeric(db?.quality_score ?? null) - numeric(da?.quality_score ?? null);
    if (quality !== 0) return quality;
    const title = Number(Boolean(b.title)) - Number(Boolean(a.title));
    if (title !== 0) return title;
    return a.canonical_url.localeCompare(b.canonical_url);
  });

  const dbCollisionGroups = [...dbIdentity.values()].filter((rows) => rows.length > 1).length;
  const sitemapCollisionGroups = [...sitemapIdentity.values()].filter((rows) => rows.length > 1).length;
  const seedOnly = seeds.filter((row) => row.freshness_status === "seed_only").length;
  const freshConfirmed = seeds.filter((row) => row.freshness_status === "fresh_confirmed").length;
  const sitemapChannel = seeds.filter((row) => (row.fresh_channels ?? []).includes("public_sitemap_presence")).length;
  const primaryCandidates = candidates.filter((row) => displayByUrl.get(row.canonical_url)?.display_eligibility === "eligible_primary").length;
  const secondaryCandidates = candidates.length - primaryCandidates;

  return {
    sourceDomain: domain,
    registry: {
      reviewStatus: registryRows[0]!.review_status,
      nextReviewAt: registryRows[0]!.next_review_at,
      policyCurrent: true,
    },
    reservoir: {
      totalSeeds: seeds.length,
      freshConfirmed,
      seedOnly,
      priorSitemapChannelRows: sitemapChannel,
    },
    currentSitemap: {
      roots: sitemap.roots,
      urlCount: sitemap.urls.length,
      sourceRequests: sitemap.requests,
      detailPageRequests: 0,
    },
    identity: {
      dbSafeIdentities: [...dbIdentity.values()].filter((rows) => rows.length === 1).length,
      dbCollisionGroups,
      sitemapSafeIdentities: [...sitemapIdentity.values()].filter((rows) => rows.length === 1).length,
      sitemapCollisionGroups,
    },
    qualification: {
      preSitemapUpperBound: preSitemap.length,
      liveCandidateRows: candidates.length,
      primaryCandidates,
      secondaryCandidates,
      excludedBySitemapOrIdentity: preSitemap.length - candidates.length,
    },
    sampleCandidateUrls: candidates.slice(0, 10).map((row) => row.canonical_url),
  };
}

async function main(): Promise<void> {
  const observedAt = new Date();
  const results = [];
  for (const domain of SOURCES) results.push(await qualify(domain, observedAt));
  const ranked = [...results].sort((a, b) => {
    const capacity = b.qualification.liveCandidateRows - a.qualification.liveCandidateRows;
    if (capacity !== 0) return capacity;
    return b.reservoir.seedOnly - a.reservoir.seedOnly;
  });
  const winner = ranked[0]!;
  const runnerUp = ranked[1]!;
  const proof = {
    schemaVersion: "data-4-7c-residual-reservoir-requalification-v1",
    mode: "READ_ONLY_RESERVOIR_COMPARISON",
    observedAt: observedAt.toISOString(),
    sources: results,
    recommendation: {
      sourceDomain: winner.sourceDomain,
      liveCandidateCapacity: winner.qualification.liveCandidateRows,
      advantageVsRunnerUp: winner.qualification.liveCandidateRows - runnerUp.qualification.liveCandidateRows,
      nextLot: "DATA-4.7D_BOUNDED_WRITE",
      note: winner.reservoir.priorSitemapChannelRows > 0
        ? "Existing public_sitemap_presence history: bounded write may reuse established source path after exact-head certification."
        : "No prior public_sitemap_presence write history on this source: next write lot must choose an explicit source-specific canary before broader expansion.",
    },
    databaseWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
    sourceSiteDetailRequests: 0,
    productionActivation: false,
  };
  if (winner.qualification.liveCandidateRows <= 0) throw new Error("DATA-4.7C found no live candidate capacity");
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

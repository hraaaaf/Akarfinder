import fs from "node:fs/promises";
import path from "node:path";

const DOMAIN = "limmobiliersansfrontieres.com";
const CHANNEL = "public_sitemap_presence";
const RUN_ID = "data-4-7b-lsf-250-v1";
const EXPECTED_BATCH = 250;
const OUT_DIR = process.env.DATA_4_7B_OUT_DIR ?? ".tmp/data-4-7b/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_SOURCE_REQUESTS = 40;
const MAX_SITEMAP_URLS = 50_000;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.7B post-write certification requires ${name}`);
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
    if (!sameOrigin(urlString)) return null;
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

async function fetchSourceText(urlString: string): Promise<string> {
  if (!sameOrigin(urlString)) throw new Error(`DATA-4.7B disallowed source URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.7B source request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.7B-post-write; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOrigin(response.url)) throw new Error(`DATA-4.7B redirect left allowed origin: ${response.url}`);
  if (!response.ok) throw new Error(`DATA-4.7B source read failed ${response.status}: ${urlString}`);
  return response.text();
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
  metadata: Record<string, unknown> | null;
};

type NormalizedRow = {
  canonical_url: string;
  normalization_status: string;
  freshness_status: string;
};

type DisplayRow = {
  canonical_url: string;
  display_eligibility: string | null;
};

type PublicRow = { canonical_url: string };

function registryAllows(row: RegistryRow, now: Date): boolean {
  const nextReview = row.next_review_at ? new Date(row.next_review_at) : null;
  return row.source_domain === DOMAIN
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

function metadataRunId(metadata: Record<string, unknown> | null): string | null {
  const evidence = metadata?.freshness_evidence;
  if (!evidence || typeof evidence !== "object") return null;
  const runId = (evidence as Record<string, unknown>).run_id;
  return typeof runId === "string" ? runId : null;
}

async function main(): Promise<void> {
  const observedAt = new Date();
  const [registryRows, seeds, normalized, displayRows, publicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,review_status,next_review_at,max_revalidation_interval_days",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_channels,metadata",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,normalization_status,freshness_status",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,display_eligibility",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url",
      source_domain: `eq.${DOMAIN}`,
    }),
  ]);

  if (registryRows.length !== 1 || !registryAllows(registryRows[0]!, observedAt)) {
    throw new Error(`DATA-4.7B Registry gate failed: ${JSON.stringify(registryRows)}`);
  }

  const robots = await fetchSourceText(`https://${DOMAIN}/robots.txt`);
  const roots = extractRobotsSitemaps(robots);
  if (roots.length === 0) throw new Error("DATA-4.7B robots declares no current same-origin sitemap");

  const queue = [...roots];
  const visited = new Set<string>();
  const sitemapUrls: string[] = [];
  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchSourceText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.7B unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      sitemapUrls.push(...parsed.locs);
      if (sitemapUrls.length > MAX_SITEMAP_URLS) throw new Error("DATA-4.7B sitemap URL ceiling exceeded");
    }
  }

  const sitemapIdentity = new Map<string, string[]>();
  for (const url of sitemapUrls) {
    const identity = conservativeUrlIdentity(url);
    if (!identity) continue;
    const bucket = sitemapIdentity.get(identity) ?? [];
    bucket.push(url);
    sitemapIdentity.set(identity, bucket);
  }

  const normalizedIdentity = new Map<string, NormalizedRow[]>();
  for (const row of normalized) {
    const identity = conservativeUrlIdentity(row.canonical_url);
    if (!identity) continue;
    const bucket = normalizedIdentity.get(identity) ?? [];
    bucket.push(row);
    normalizedIdentity.set(identity, bucket);
  }

  const cohort = seeds.filter((row) => metadataRunId(row.metadata) === RUN_ID);
  if (cohort.length !== EXPECTED_BATCH) throw new Error(`DATA-4.7B cohort drift: ${cohort.length}/${EXPECTED_BATCH}`);

  const cohortUrls = new Set(cohort.map((row) => row.canonical_url));
  const normalizedByUrl = new Map(normalized.map((row) => [row.canonical_url, row]));
  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));

  let currentSitemapConfirmedRows = 0;
  let freshConfirmedRows = 0;
  let sitemapChannelRows = 0;
  let normalizedRows = 0;
  let technicalDisplayRows = 0;
  let publicSearchRows = 0;
  let freshnessProjectionRows = 0;

  for (const row of cohort) {
    const identity = conservativeUrlIdentity(row.canonical_url);
    if (identity && sitemapIdentity.get(identity)?.length === 1 && normalizedIdentity.get(identity)?.length === 1) currentSitemapConfirmedRows += 1;
    if (row.freshness_status === "fresh_confirmed") freshConfirmedRows += 1;
    if ((row.fresh_channels ?? []).includes(CHANNEL)) sitemapChannelRows += 1;
    const normalizedRow = normalizedByUrl.get(row.canonical_url);
    if (normalizedRow?.normalization_status === "normalized") normalizedRows += 1;
    if (["eligible_primary", "eligible_secondary"].includes(displayByUrl.get(row.canonical_url)?.display_eligibility ?? "")) technicalDisplayRows += 1;
    if (publicSet.has(row.canonical_url)) publicSearchRows += 1;
    if (normalizedRow?.freshness_status === "fresh_confirmed") freshnessProjectionRows += 1;
  }

  const residualLiveCandidates = normalized.filter((row) => {
    if (row.normalization_status !== "normalized" || row.freshness_status !== "seed_only") return false;
    if (cohortUrls.has(row.canonical_url)) return false;
    const identity = conservativeUrlIdentity(row.canonical_url);
    if (!identity || sitemapIdentity.get(identity)?.length !== 1 || normalizedIdentity.get(identity)?.length !== 1) return false;
    if (!["eligible_primary", "eligible_secondary"].includes(displayByUrl.get(row.canonical_url)?.display_eligibility ?? "")) return false;
    return publicSet.has(row.canonical_url);
  }).length;

  const certification = {
    expectedRows: EXPECTED_BATCH,
    cohortRows: cohort.length,
    currentSitemapConfirmedRows,
    freshConfirmedRows,
    sitemapChannelRows,
    normalizedRows,
    technicalDisplayRows,
    publicSearchRows,
    freshnessProjectionRows,
  };

  for (const [key, value] of Object.entries(certification)) {
    if (value !== EXPECTED_BATCH) throw new Error(`DATA-4.7B post-write certification drift ${key}=${value}`);
  }

  const proof = {
    schemaVersion: "data-4-7b-lsf-post-write-certification-v1",
    mode: "POST_WRITE_CERTIFIED_READ_ONLY",
    runId: RUN_ID,
    observedAt: observedAt.toISOString(),
    sourceDomain: DOMAIN,
    currentSitemapUrlCount: sitemapUrls.length,
    certification,
    residualLiveCandidates,
    aggregate: {
      totalSeeds: seeds.length,
      freshConfirmed: seeds.filter((row) => row.freshness_status === "fresh_confirmed").length,
      seedOnly: seeds.filter((row) => row.freshness_status === "seed_only").length,
      sitemapChannel: seeds.filter((row) => (row.fresh_channels ?? []).includes(CHANNEL)).length,
    },
    sourceRequests,
    sourceSiteDetailRequests: 0,
    databaseWrites: 0,
    rollbackWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
    productionActivation: false,
    repeatApplyAuthorized: false,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "post-write-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

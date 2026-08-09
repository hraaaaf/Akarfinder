import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCES = [
  "daragadir.com",
  "promoimmomarrakech.com",
  "aykana.ma",
  "limmobiliersansfrontieres.com",
] as const;
type SourceDomain = typeof SOURCES[number];

const OUT_DIR = process.env.DATA_4_8A_OUT_DIR ?? ".tmp/data-4-8a/results";
const STRUCTURE_REGISTRY_PATH = "data/openserp/source-domain-registry.json";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_REQUESTS_PER_SOURCE = 40;
const MAX_SITEMAP_URLS_PER_SOURCE = 50_000;

type PatternEntry = string | { pattern: string; case_insensitive?: boolean };
type StructureSource = {
  domain: string;
  status: string;
  listing_url_patterns: PatternEntry[];
  blocked_url_patterns: PatternEntry[];
  reviewed_at?: string | null;
};
type StructureRegistry = {
  registry_version: string;
  generated_at: string;
  note?: string;
  domains: StructureSource[];
};
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
type SeedRow = { canonical_url: string };

type ClassifiedUrl = {
  canonicalUrl: string;
  pathname: string;
  identity: string;
  classification: "DETAIL_PATTERN_MATCH" | "REJECT_BLOCKED_PATTERN" | "REJECT_NAMESPACE_ROOT" | "REJECT_NO_DETAIL_PATTERN";
  matchedListingPattern: string | null;
  matchedBlockedPattern: string | null;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.8A requires ${name}`);
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

function patternText(entry: PatternEntry): string {
  return typeof entry === "string" ? entry : entry.pattern;
}

function compilePattern(entry: PatternEntry): RegExp {
  const source = patternText(entry);
  const flags = typeof entry === "object" && entry.case_insensitive ? "i" : "";
  return new RegExp(source, flags);
}

function isPlainNamespaceRoot(entry: PatternEntry, pathname: string): boolean {
  const source = patternText(entry);
  if (!/^\/[A-Za-z0-9_-]+\/$/.test(source)) return false;
  const normalizedPath = pathname.replace(/\/+$/, "/");
  return normalizedPath === source;
}

function classifyPath(structure: StructureSource, canonicalUrl: string, identity: string): ClassifiedUrl {
  const pathname = new URL(canonicalUrl).pathname;
  const blocked = structure.blocked_url_patterns.find((entry) => compilePattern(entry).test(pathname));
  if (blocked) {
    return {
      canonicalUrl,
      pathname,
      identity,
      classification: "REJECT_BLOCKED_PATTERN",
      matchedListingPattern: null,
      matchedBlockedPattern: patternText(blocked),
    };
  }
  const namespaceRoot = structure.listing_url_patterns.find((entry) => isPlainNamespaceRoot(entry, pathname));
  if (namespaceRoot) {
    return {
      canonicalUrl,
      pathname,
      identity,
      classification: "REJECT_NAMESPACE_ROOT",
      matchedListingPattern: patternText(namespaceRoot),
      matchedBlockedPattern: null,
    };
  }
  const listing = structure.listing_url_patterns.find((entry) => compilePattern(entry).test(pathname));
  if (listing) {
    return {
      canonicalUrl,
      pathname,
      identity,
      classification: "DETAIL_PATTERN_MATCH",
      matchedListingPattern: patternText(listing),
      matchedBlockedPattern: null,
    };
  }
  return {
    canonicalUrl,
    pathname,
    identity,
    classification: "REJECT_NO_DETAIL_PATTERN",
    matchedListingPattern: null,
    matchedBlockedPattern: null,
  };
}

async function fetchSourceText(domain: SourceDomain, urlString: string, counter: { value: number }): Promise<string> {
  if (!sameOrigin(domain, urlString)) throw new Error(`disallowed_source_url:${urlString}`);
  counter.value += 1;
  if (counter.value > MAX_REQUESTS_PER_SOURCE) throw new Error("source_request_budget_exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.8A; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOrigin(domain, response.url)) throw new Error(`redirect_left_allowed_origin:${response.url}`);
  if (!response.ok) throw new Error(`source_read_failed:${response.status}:${urlString}`);
  return response.text();
}

async function readCurrentSitemap(domain: SourceDomain): Promise<{ urls: string[]; roots: string[]; requests: number }> {
  const counter = { value: 0 };
  const robots = await fetchSourceText(domain, `https://${domain}/robots.txt`, counter);
  const roots = extractRobotsSitemaps(domain, robots);
  if (roots.length === 0) throw new Error("robots_declares_no_same_origin_https_sitemap");
  const queue = [...roots];
  const visited = new Set<string>();
  const urls: string[] = [];
  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(domain, await fetchSourceText(domain, sitemapUrl, counter));
    if (parsed.kind === "unknown") throw new Error(`unknown_sitemap_payload:${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      urls.push(...parsed.locs);
      if (urls.length > MAX_SITEMAP_URLS_PER_SOURCE) throw new Error("sitemap_url_ceiling_exceeded");
    }
  }
  return { urls: [...new Set(urls)].sort(), roots, requests: counter.value };
}

function sha256Lines(lines: string[]): string {
  return crypto.createHash("sha256").update(lines.join("\n")).digest("hex");
}

async function qualifySource(domain: SourceDomain, structure: StructureSource, observedAt: Date) {
  const [registryRows, seeds] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,review_status,next_review_at,max_revalidation_interval_days",
      source_domain: `eq.${domain}`,
    }),
    restAll<SeedRow>("source_offer_seeds", { select: "canonical_url", source_domain: `eq.${domain}` }),
  ]);

  const registry = registryRows[0] ?? null;
  const base = {
    sourceDomain: domain,
    liveRegistryAuthorized: Boolean(registry && registryRows.length === 1 && registryAllows(domain, registry, observedAt)),
    structureRegistry: {
      registryPath: STRUCTURE_REGISTRY_PATH,
      registryStatus: structure.status,
      reviewedAt: structure.reviewed_at ?? null,
      listingPatterns: structure.listing_url_patterns.map(patternText),
      blockedPatterns: structure.blocked_url_patterns.map(patternText),
      authorizationAuthority: false,
    },
    seedRows: seeds.length,
  };

  if (!registry || registryRows.length !== 1 || !registryAllows(domain, registry, observedAt)) {
    return {
      ...base,
      status: "BLOCKED_POLICY" as const,
      blocker: "registry_gate_failed",
      currentSitemap: { roots: [] as string[], urlCount: 0, sourceRequests: 0, detailPageRequests: 0 },
      netNewIdentityRows: 0,
      detailCandidateRows: 0,
      rejectedRows: 0,
      candidateDigestSha256: null as string | null,
      candidates: [] as ClassifiedUrl[],
      rejects: [] as ClassifiedUrl[],
    };
  }

  let sitemap: { urls: string[]; roots: string[]; requests: number };
  try {
    sitemap = await readCurrentSitemap(domain);
  } catch (error) {
    return {
      ...base,
      status: "BLOCKED_SOURCE_EVIDENCE" as const,
      blocker: error instanceof Error ? error.message : String(error),
      currentSitemap: { roots: [] as string[], urlCount: 0, sourceRequests: 0, detailPageRequests: 0 },
      netNewIdentityRows: 0,
      detailCandidateRows: 0,
      rejectedRows: 0,
      candidateDigestSha256: null as string | null,
      candidates: [] as ClassifiedUrl[],
      rejects: [] as ClassifiedUrl[],
    };
  }

  const seedIdentities = new Set<string>();
  for (const seed of seeds) {
    const identity = conservativeUrlIdentity(domain, seed.canonical_url);
    if (identity) seedIdentities.add(identity);
  }

  const sitemapIdentityRows = new Map<string, string[]>();
  for (const canonicalUrl of sitemap.urls) {
    const identity = conservativeUrlIdentity(domain, canonicalUrl);
    if (!identity) continue;
    const bucket = sitemapIdentityRows.get(identity) ?? [];
    bucket.push(canonicalUrl);
    sitemapIdentityRows.set(identity, bucket);
  }

  const netNew = [...sitemapIdentityRows.entries()]
    .filter(([identity, rows]) => rows.length === 1 && !seedIdentities.has(identity))
    .map(([identity, rows]) => classifyPath(structure, rows[0]!, identity))
    .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));

  const candidates = netNew.filter((row) => row.classification === "DETAIL_PATTERN_MATCH");
  const rejects = netNew.filter((row) => row.classification !== "DETAIL_PATTERN_MATCH");
  const candidateUrls = candidates.map((row) => row.canonicalUrl);

  return {
    ...base,
    status: "QUALIFIED" as const,
    blocker: null,
    currentSitemap: {
      roots: sitemap.roots,
      urlCount: sitemap.urls.length,
      sourceRequests: sitemap.requests,
      detailPageRequests: 0,
    },
    netNewIdentityRows: netNew.length,
    detailCandidateRows: candidates.length,
    rejectedRows: rejects.length,
    rejectsByReason: {
      blockedPattern: rejects.filter((row) => row.classification === "REJECT_BLOCKED_PATTERN").length,
      namespaceRoot: rejects.filter((row) => row.classification === "REJECT_NAMESPACE_ROOT").length,
      noDetailPattern: rejects.filter((row) => row.classification === "REJECT_NO_DETAIL_PATTERN").length,
    },
    candidateDigestSha256: sha256Lines(candidateUrls),
    candidates,
    rejects,
  };
}

async function main(): Promise<void> {
  const observedAt = new Date();
  const structureRegistry = JSON.parse(await fs.readFile(STRUCTURE_REGISTRY_PATH, "utf8")) as StructureRegistry;
  if (!structureRegistry.registry_version || !Array.isArray(structureRegistry.domains)) throw new Error("DATA-4.8A invalid structure registry");

  const structureByDomain = new Map(structureRegistry.domains.map((entry) => [entry.domain, entry]));
  const results = [];
  for (const domain of SOURCES) {
    const structure = structureByDomain.get(domain);
    if (!structure || !Array.isArray(structure.listing_url_patterns) || structure.listing_url_patterns.length === 0) {
      throw new Error(`DATA-4.8A missing reviewed structural listing patterns for ${domain}`);
    }
    results.push(await qualifySource(domain, structure, observedAt));
  }

  const qualified = results.filter((result) => result.status === "QUALIFIED");
  const candidates = qualified.flatMap((result) => result.candidates.map((candidate) => ({ sourceDomain: result.sourceDomain, ...candidate })));
  const rejects = qualified.flatMap((result) => result.rejects.map((reject) => ({ sourceDomain: result.sourceDomain, ...reject })));
  const sortedCandidateUrls = candidates.map((row) => row.canonicalUrl).sort();

  const proof = {
    schemaVersion: "data-4-8a-net-new-sitemap-qualification-v1",
    mode: "READ_ONLY_STRUCTURAL_DETAIL_QUALIFICATION",
    observedAt: observedAt.toISOString(),
    structureRegistry: {
      path: STRUCTURE_REGISTRY_PATH,
      version: structureRegistry.registry_version,
      generatedAt: structureRegistry.generated_at,
      permissionAuthority: false,
    },
    sources: results.map(({ candidates: _candidates, rejects: _rejects, ...summary }) => summary),
    summary: {
      sourceCount: results.length,
      qualifiedSourceCount: qualified.length,
      blockedSourceCount: results.length - qualified.length,
      netNewIdentityRows: qualified.reduce((sum, result) => sum + result.netNewIdentityRows, 0),
      structuralDetailCandidateRows: candidates.length,
      rejectedRows: rejects.length,
      candidateDigestSha256: sha256Lines(sortedCandidateUrls),
    },
    recommendation: {
      nextLot: candidates.length > 0 ? "DATA-4.8B_BOUNDED_NET_NEW_SEED_INGESTION" : "NO_NET_NEW_DETAIL_CANDIDATES",
      candidateRows: candidates.length,
      note: "Structural detail-pattern match is not detail-content reuse. A write lot may create only provenance-preserving canonical-link seeds under the live Source Registry contract; no detail-page fetch is authorized by this proof.",
    },
    databaseWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
    sourceSiteDetailRequests: 0,
    productionActivation: false,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "candidate-manifest.json"), `${JSON.stringify(candidates, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "reject-manifest.json"), `${JSON.stringify(rejects, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "candidate-urls.txt"), `${sortedCandidateUrls.join("\n")}${sortedCandidateUrls.length ? "\n" : ""}`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

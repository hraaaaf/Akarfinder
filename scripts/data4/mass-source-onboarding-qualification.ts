import { gunzipSync } from "node:zlib";

export const DATA_4_9A_CANDIDATES = [
  "agadirimmobilier.ma",
  "capital-properties.ma",
  "christiesrealestatemorocco.com",
  "immo-maroc.com",
  "immobest.ma",
  "immotaroudant.com",
  "mhproperties.ma",
  "nouraimmobilier.ma",
  "proimmobilier.ma",
  "valfoncier.ma",
] as const;

export type Data49aCandidate = typeof DATA_4_9A_CANDIDATES[number];
export type CapacityKind = "complete" | "lower_bound_request_cap" | "lower_bound_url_cap";

export type RegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  allowed_discovery_channels: string[] | null;
  display_gate: string | null;
  ingestion_gate: string | null;
  robots_status: string | null;
  terms_status: string | null;
  review_status: string | null;
  next_review_at: string | null;
  current_representation_count: number | null;
};

export type SitemapRead = {
  roots: string[];
  urls: string[];
  sourceRequests: number;
  capacityKind: CapacityKind;
};

export type PathSignals = {
  topPrefixes: Array<{ prefix: string; count: number }>;
  idLikePathRows: number;
  htmlLikeRows: number;
  propertyWordRows: number;
};

const MAX_REQUESTS_PER_SOURCE = 40;
const MAX_SITEMAP_URLS_PER_SOURCE = 100_000;
const TIMEOUT_MS = 20_000;

export function allowedHost(domain: string, hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const expected = domain.toLowerCase().replace(/\.$/, "");
  return host === expected || host === `www.${expected}`;
}

export function sameOriginHttps(domain: string, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && allowedHost(domain, url.hostname);
  } catch {
    return false;
  }
}

export function extractDeclaredSitemaps(domain: string, robotsText: string): string[] {
  const out = new Set<string>();
  for (const line of robotsText.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && sameOriginHttps(domain, match[1])) out.add(match[1]);
  }
  return [...out].sort();
}

export function parseSitemapXml(domain: string, xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&").trim())
    .filter((url) => sameOriginHttps(domain, url));
  return { kind, locs: [...new Set(locs)].sort() };
}

export function conservativeUrlIdentity(domain: string, rawUrl: string): string | null {
  try {
    if (!sameOriginHttps(domain, rawUrl)) return null;
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname).normalize("NFC");
    } catch {
      pathname = url.pathname;
    }
    pathname = pathname.replace(/\/+$/, "") || "/";
    const pairs = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
    const search = new URLSearchParams(pairs).toString();
    return `https://${host}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return null;
  }
}

export function registryIsCurrentOnboardingCandidate(domain: string, row: RegistryRow, now: Date): boolean {
  const nextReview = row.next_review_at ? new Date(row.next_review_at) : null;
  return row.source_domain === domain
    && row.robots_status === "sitemap_declared"
    && row.review_status === "current"
    && row.display_gate === "hidden"
    && row.ingestion_gate === "internal_signal_only"
    && row.acquisition_mode === "public_index_internal_only"
    && (row.allowed_discovery_channels ?? []).includes("public_index")
    && (row.allowed_discovery_channels ?? []).includes("commoncrawl")
    && row.authorization_status !== "prohibited"
    && (row.current_representation_count ?? 0) === 0
    && nextReview instanceof Date
    && Number.isFinite(nextReview.getTime())
    && nextReview.getTime() > now.getTime();
}

export function decodeSitemapPayload(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes);
  const gzipMagic = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  return gzipMagic ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
}

async function fetchSourceText(domain: string, rawUrl: string): Promise<string> {
  if (!sameOriginHttps(domain, rawUrl)) throw new Error(`disallowed_source_url:${rawUrl}`);
  const response = await fetch(rawUrl, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.9A; robots-sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOriginHttps(domain, response.url)) throw new Error(`redirect_left_allowed_origin:${response.url}`);
  if (!response.ok) throw new Error(`source_read_failed:${response.status}:${rawUrl}`);
  return decodeSitemapPayload(new Uint8Array(await response.arrayBuffer()));
}

export async function readDeclaredSitemaps(domain: string): Promise<SitemapRead> {
  let sourceRequests = 0;
  const read = async (url: string) => {
    if (sourceRequests >= MAX_REQUESTS_PER_SOURCE) throw new Error("source_request_budget_exceeded");
    sourceRequests += 1;
    return fetchSourceText(domain, url);
  };

  const robots = await read(`https://${domain}/robots.txt`);
  const roots = extractDeclaredSitemaps(domain, robots);
  if (roots.length === 0) throw new Error("robots_declares_no_same_origin_https_sitemap");

  const queue = [...roots];
  const visited = new Set<string>();
  const urls = new Set<string>();
  let capacityKind: CapacityKind = "complete";

  while (queue.length > 0) {
    if (sourceRequests >= MAX_REQUESTS_PER_SOURCE) {
      capacityKind = "lower_bound_request_cap";
      break;
    }
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(domain, await read(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`unknown_sitemap_payload:${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) {
        if (!visited.has(child) && !queue.includes(child)) queue.push(child);
      }
      continue;
    }
    for (const url of parsed.locs) {
      urls.add(url);
      if (urls.size >= MAX_SITEMAP_URLS_PER_SOURCE) {
        capacityKind = "lower_bound_url_cap";
        queue.length = 0;
        break;
      }
    }
  }

  return { roots, urls: [...urls].sort(), sourceRequests, capacityKind };
}

export function summarizePathSignals(urls: string[]): PathSignals {
  const prefixCounts = new Map<string, number>();
  let idLikePathRows = 0;
  let htmlLikeRows = 0;
  let propertyWordRows = 0;

  for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const prefix = segments[0] ? `/${segments[0]}/` : "/";
    prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    if (/(?:^|[-_/])(?:\d{3,}|[a-f0-9]{8,})(?:\.[a-z0-9]+)?\/?$/i.test(url.pathname)) idLikePathRows += 1;
    if (/\.html?\/?$/i.test(url.pathname)) htmlLikeRows += 1;
    if (/(?:property|propriete|bien|annonce|immobilier|vente|location)/i.test(url.pathname)) propertyWordRows += 1;
  }

  const topPrefixes = [...prefixCounts.entries()]
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix))
    .slice(0, 8);

  return { topPrefixes, idLikePathRows, htmlLikeRows, propertyWordRows };
}

export function computeMassScore(input: {
  observedNetNewIdentities: number;
  sourceRequests: number;
  collisionRows: number;
  uniqueIdentityRows: number;
  capacityKind: CapacityKind;
}): number {
  const n = input.observedNetNewIdentities;
  const capacity = n >= 5000 ? 60 : n >= 2000 ? 55 : n >= 1000 ? 50 : n >= 500 ? 45 : n >= 250 ? 38 : n >= 100 ? 30 : n >= 50 ? 20 : n > 0 ? 10 : 0;
  const evidence = 20;
  const collisionRate = input.uniqueIdentityRows > 0 ? input.collisionRows / input.uniqueIdentityRows : 0;
  const identitySafety = collisionRate <= 0.01 ? 10 : collisionRate <= 0.05 ? 5 : 0;
  const efficiency = input.sourceRequests <= 10 ? 10 : input.sourceRequests <= 20 ? 7 : input.sourceRequests <= 40 ? 4 : 0;
  const truncationPenalty = input.capacityKind === "complete" ? 0 : -3;
  return Math.max(0, Math.min(100, capacity + evidence + identitySafety + efficiency + truncationPenalty));
}

export function massRecommendation(score: number, observedNetNewIdentities: number): "HIGH_MASS_ONBOARDING_CANDIDATE" | "MEDIUM_MASS_ONBOARDING_CANDIDATE" | "LOW_MASS_ONBOARDING_CANDIDATE" | "NO_CURRENT_SITEMAP_CAPACITY" {
  if (observedNetNewIdentities <= 0) return "NO_CURRENT_SITEMAP_CAPACITY";
  if (score >= 70 && observedNetNewIdentities >= 250) return "HIGH_MASS_ONBOARDING_CANDIDATE";
  if (score >= 55 && observedNetNewIdentities >= 100) return "MEDIUM_MASS_ONBOARDING_CANDIDATE";
  return "LOW_MASS_ONBOARDING_CANDIDATE";
}

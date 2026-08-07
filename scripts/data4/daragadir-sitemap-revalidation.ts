export interface DarAgadirRevalidationPolicy {
  sourceDomain: string;
  acquisitionMode: string | null;
  discoveryPolicy: string | null;
  displayPolicy: string | null;
  displayGate: string | null;
  allowedDiscoveryChannels: string[];
  robotsStatus: string | null;
  evidenceUrls: string[];
  maxRevalidationIntervalDays: number | null;
  reviewStatus: string | null;
}

export interface ExistingDarAgadirRow {
  canonicalUrl: string;
  freshnessStatus: string;
  normalizationStatus: string;
}

export function policyAllowsSitemapRevalidation(policy: DarAgadirRevalidationPolicy): boolean {
  return policy.sourceDomain === "daragadir.com"
    && policy.acquisitionMode === "public_sitemap_canonical_link"
    && policy.discoveryPolicy === "public_sitemap_only"
    && policy.displayPolicy === "canonical_link_only"
    && policy.displayGate === "external_tail_link_only"
    && policy.allowedDiscoveryChannels.includes("public_sitemap")
    && policy.robotsStatus === "sitemap_declared"
    && policy.maxRevalidationIntervalDays === 14
    && ["current", "due_soon"].includes(policy.reviewStatus ?? "")
    && policy.evidenceUrls.includes("https://daragadir.com/robots.txt");
}

export function sameDarAgadirOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && ["daragadir.com", "www.daragadir.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function extractRobotsSitemaps(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && sameDarAgadirOrigin(match[1])) out.add(match[1]);
  }
  return [...out].sort();
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function parseSitemapXml(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter((value) => sameDarAgadirOrigin(value));
  return { kind, locs: [...new Set(locs)].sort() };
}

export function compareExistingToSitemap(rows: ExistingDarAgadirRow[], sitemapUrls: Set<string>) {
  let existingPresent = 0;
  let seedOnlyPresent = 0;
  let freshPresent = 0;
  let existingMissing = 0;

  for (const row of rows) {
    if (sitemapUrls.has(row.canonicalUrl)) {
      existingPresent += 1;
      if (row.freshnessStatus === "seed_only") seedOnlyPresent += 1;
      if (row.freshnessStatus === "fresh_confirmed") freshPresent += 1;
    } else {
      existingMissing += 1;
    }
  }

  return {
    existingRows: rows.length,
    existingPresent,
    existingMissing,
    seedOnlyPresent,
    freshPresent,
    presenceRatio: rows.length ? existingPresent / rows.length : 0,
  };
}

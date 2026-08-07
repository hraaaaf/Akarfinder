export type CandidateSeed = {
  rank: number;
  domain: string;
  class: "PRIMARY_SOURCE_CANDIDATE";
  reviewPriority: number;
  b3Urls: number;
  ccSignalPages: number;
  ccIndexedPages: number;
  registry: false;
};

export type HttpEvidence = {
  requestedUrl: string;
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  bytesRead: number;
  truncated: boolean;
  error: string | null;
};

export type RobotsRule = { directive: "allow" | "disallow"; path: string };
export type ParsedRobots = {
  groups: Array<{ userAgents: string[]; rules: RobotsRule[] }>;
  sitemapUrls: string[];
};

export type CmsFamily = "HOUZEZ" | "REALHOMES" | "WORDPRESS" | "CUSTOM" | "UNKNOWN";
export type ConnectorFamilyCandidate =
  | "WORDPRESS_HOUZEZ"
  | "WORDPRESS_REALHOMES"
  | "WORDPRESS_GENERIC"
  | "PUBLIC_FEED_DISCOVERED"
  | "PUBLIC_REST_DISCOVERED"
  | "SITEMAP_JSONLD"
  | "SITEMAP_STRUCTURED_HTML"
  | "STRUCTURED_HTML"
  | "MANUAL_REVIEW_CUSTOM"
  | "BLOCKED_OR_INACCESSIBLE";

export type TechnicalGate =
  | "CAPABILITY_REVIEW_READY"
  | "REVIEW_ONLY_NOINDEX"
  | "REVIEW_ONLY_ACCESS_CONTROL"
  | "REVIEW_ONLY_ROBOTS_BLOCK"
  | "REVIEW_ONLY_ROBOTS_UNAVAILABLE"
  | "REVIEW_ONLY_HOMEPAGE_UNAVAILABLE";

export type TechnicalCapabilityAudit = {
  seed: CandidateSeed;
  generatedAt: string;
  requestCount: number;
  robots: {
    evidence: HttpEvidence;
    status: "PRESENT" | "MISSING" | "BLOCKED" | "UNAVAILABLE";
    disallowAll: boolean;
    sitemapUrls: string[];
  };
  homepage: {
    evidence: HttpEvidence | null;
    title: string | null;
    noindex: boolean;
    accessControlSignal: boolean;
    listingLinkCount: number;
    explicitFeedUrls: string[];
    explicitRestUrls: string[];
  };
  sitemaps: {
    fetched: HttpEvidence[];
    locCount: number;
    listingLocCount: number;
    latestLastmod: string | null;
  };
  structuredData: {
    hasJsonLd: boolean;
    schemaTypes: string[];
  };
  cms: CmsFamily;
  wpJson: {
    evidence: HttpEvidence | null;
    public: boolean;
    routeCount: number;
  };
  capabilityScore: number;
  connectorFamilyCandidate: ConnectorFamilyCandidate;
  technicalGate: TechnicalGate;
  effectivePolicyCandidate: null;
};

const LISTING_PATH_RE = /\/(?:property|properties|listing|listings|bien|biens|annonce|annonces|offre|offres|vente|location|programme|programmes|project|projects|projet|projets)(?:\/|[-_?#]|$)/i;
const ACCESS_CONTROL_RE = /(captcha|verify you are human|access denied|forbidden|connexion requise|login required|sign in to continue|cf-chl-|challenge-platform|cf-browser-verification|cloudflare ray id|attention required!\s*\|\s*cloudflare)/i;
const LOGIN_PATH_RE = /\/(?:login|signin|sign-in|auth|account)(?:\/|$)/i;

export function normalizeAuditDomain(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!normalized || !normalized.includes(".") || normalized.includes("/") || normalized.includes(" ")) {
    throw new Error(`Invalid audit domain: ${value}`);
  }
  return normalized;
}

export function validateCandidateSeed(candidates: CandidateSeed[]): CandidateSeed[] {
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 100) {
    throw new Error("DATA-1.5 seed must contain between 1 and 100 candidates");
  }
  const seen = new Set<string>();
  return candidates.map((candidate) => {
    const domain = normalizeAuditDomain(candidate.domain);
    if (candidate.class !== "PRIMARY_SOURCE_CANDIDATE") throw new Error(`${domain}: class must be PRIMARY_SOURCE_CANDIDATE`);
    if (candidate.registry !== false) throw new Error(`${domain}: DATA-1.5 seed must exclude registered sources`);
    if (!Number.isInteger(candidate.rank) || candidate.rank < 1) throw new Error(`${domain}: invalid rank`);
    for (const [field, value] of Object.entries({
      reviewPriority: candidate.reviewPriority,
      b3Urls: candidate.b3Urls,
      ccSignalPages: candidate.ccSignalPages,
      ccIndexedPages: candidate.ccIndexedPages,
    })) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`${domain}: invalid ${field}`);
    }
    if (seen.has(domain)) throw new Error(`Duplicate DATA-1.5 seed domain: ${domain}`);
    seen.add(domain);
    return { ...candidate, domain };
  });
}

export function parseRobots(body: string): ParsedRobots {
  const groups: ParsedRobots["groups"] = [];
  const sitemapUrls = new Set<string>();
  let userAgents: string[] = [];
  let rules: RobotsRule[] = [];
  let sawRule = false;

  const flush = () => {
    if (userAgents.length > 0) groups.push({ userAgents: [...new Set(userAgents)], rules: [...rules] });
    userAgents = [];
    rules = [];
    sawRule = false;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "").trim();
    if (!withoutComment) continue;
    const match = withoutComment.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1]!.trim().toLowerCase();
    const value = match[2]!.trim();
    if (key === "sitemap") {
      if (/^https?:\/\//i.test(value)) sitemapUrls.add(value);
      continue;
    }
    if (key === "user-agent") {
      if (sawRule) flush();
      userAgents.push(value.toLowerCase());
      continue;
    }
    if ((key === "allow" || key === "disallow") && userAgents.length > 0) {
      sawRule = true;
      rules.push({ directive: key, path: value });
    }
  }
  flush();
  return { groups, sitemapUrls: [...sitemapUrls].sort() };
}

function patternMatches(pathname: string, pattern: string): boolean {
  if (pattern === "") return false;
  const endAnchored = pattern.endsWith("$");
  const raw = endAnchored ? pattern.slice(0, -1) : pattern;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(`^${escaped}${endAnchored ? "$" : ""}`);
  return regex.test(pathname);
}

function ruleSpecificity(path: string): number {
  return path.replace(/[*$]/g, "").length;
}

export function isRobotsPathAllowed(parsed: ParsedRobots, pathname: string, userAgent = "akarfinder-technical-audit"): boolean {
  const ua = userAgent.toLowerCase();
  const exactGroups = parsed.groups.filter((group) => group.userAgents.some((agent) => agent !== "*" && ua.includes(agent)));
  const groups = exactGroups.length > 0 ? exactGroups : parsed.groups.filter((group) => group.userAgents.includes("*"));
  const matching = groups
    .flatMap((group) => group.rules)
    .filter((rule) => patternMatches(pathname, rule.path))
    .sort((a, b) => ruleSpecificity(b.path) - ruleSpecificity(a.path) || (a.directive === "allow" ? -1 : 1));
  if (matching.length === 0) return true;
  return matching[0]!.directive === "allow";
}

export function robotsDisallowAll(parsed: ParsedRobots): boolean {
  return !isRobotsPathAllowed(parsed, "/");
}

function extractTitle(html: string): string | null {
  const value = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  return value ? value.slice(0, 300) : null;
}

function extractAttributeUrls(html: string): string[] {
  const values = new Set<string>();
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) {
    const value = match[1]?.trim();
    if (value) values.add(value);
  }
  return [...values];
}

function absolutePublicUrls(html: string, baseUrl: string): string[] {
  const values = new Set<string>();
  for (const raw of extractAttributeUrls(html)) {
    try {
      const url = new URL(raw, baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") values.add(url.toString());
    } catch {
      // Ignore malformed public markup.
    }
  }
  return [...values];
}

export function detectNoindex(html: string, headers: Record<string, string> = {}): boolean {
  const meta = [...html.matchAll(/<meta[^>]+name\s*=\s*["'](?:robots|googlebot)["'][^>]+content\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1] ?? "")
    .join(",");
  const reversed = [...html.matchAll(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["'](?:robots|googlebot)["'][^>]*>/gi)]
    .map((match) => match[1] ?? "")
    .join(",");
  const xRobots = headers["x-robots-tag"] ?? "";
  return /(?:^|[,;\s])noindex(?:$|[,;\s])/i.test(`${meta},${reversed},${xRobots}`);
}

export function detectAccessControl(html: string, finalUrl: string | null): boolean {
  if (ACCESS_CONTROL_RE.test(html.slice(0, 200_000))) return true;
  if (finalUrl) {
    try {
      if (LOGIN_PATH_RE.test(new URL(finalUrl).pathname)) return true;
    } catch {
      return true;
    }
  }
  return false;
}

function collectSchemaTypes(value: unknown, output: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaTypes(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  if (typeof typeValue === "string") output.add(typeValue);
  if (Array.isArray(typeValue)) for (const item of typeValue) if (typeof item === "string") output.add(item);
  for (const nested of Object.values(record)) collectSchemaTypes(nested, output);
}

export function extractJsonLdSchemaTypes(html: string): string[] {
  const output = new Set<string>();
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      collectSchemaTypes(JSON.parse(raw), output);
    } catch {
      // Invalid JSON-LD is evidence of markup presence, not a reason to fail the audit.
    }
  }
  return [...output].sort().slice(0, 100);
}

export function detectCmsFamily(html: string, headers: Record<string, string> = {}): CmsFamily {
  const haystack = `${html.slice(0, 1_000_000)}\n${Object.values(headers).join("\n")}`.toLowerCase();
  if (/wp-content\/themes\/houzez|\bhouzez\b|fave_property/.test(haystack)) return "HOUZEZ";
  if (/wp-content\/themes\/realhomes|\brealhomes\b|\binspiry\b/.test(haystack)) return "REALHOMES";
  if (/wp-content\/|wp-includes\/|api\.w\.org|generator[^>]+wordpress|\bwordpress\b/.test(haystack)) return "WORDPRESS";
  if (/<html|<!doctype html/i.test(html)) return "CUSTOM";
  return "UNKNOWN";
}

export function extractHomepageSignals(html: string, baseUrl: string): {
  title: string | null;
  listingLinkCount: number;
  explicitFeedUrls: string[];
  explicitRestUrls: string[];
} {
  const urls = absolutePublicUrls(html, baseUrl);
  const listingLinks = new Set<string>();
  const feeds = new Set<string>();
  const rest = new Set<string>();
  for (const value of urls) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    if (LISTING_PATH_RE.test(url.pathname)) listingLinks.add(value);
    const path = `${url.pathname}${url.search}`.toLowerCase();
    if (/(?:feed|export|syndication)/.test(path) && /(?:\.xml|\.csv|\.json|\/feed\/?$)/.test(path)) feeds.add(value);
    if (/\/wp-json\/?|\/api\/|\/rest\/|\/graphql(?:\/|$)/.test(path) || url.hostname === "api.w.org") rest.add(value);
  }
  for (const match of html.matchAll(/<link[^>]+rel\s*=\s*["'][^"']*alternate[^"']*["'][^>]+(?:type\s*=\s*["'](?:application\/(?:rss\+xml|atom\+xml)|text\/csv)["'])[^>]+href\s*=\s*["']([^"']+)["']/gi)) {
    try { feeds.add(new URL(match[1]!, baseUrl).toString()); } catch { /* ignore */ }
  }
  return {
    title: extractTitle(html),
    listingLinkCount: listingLinks.size,
    explicitFeedUrls: [...feeds].sort().slice(0, 20),
    explicitRestUrls: [...rest].sort().slice(0, 20),
  };
}

export function extractSitemapSignals(xml: string): { locUrls: string[]; locCount: number; listingLocCount: number; latestLastmod: string | null } {
  const locUrls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]!.trim());
  const listingLocCount = locUrls.filter((value) => {
    try { return LISTING_PATH_RE.test(new URL(value).pathname); } catch { return false; }
  }).length;
  const lastmods = [...xml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/gi)]
    .map((match) => match[1]!.trim())
    .filter((value) => Number.isFinite(Date.parse(value)))
    .map((value) => new Date(value).toISOString())
    .sort();
  return { locUrls, locCount: locUrls.length, listingLocCount, latestLastmod: lastmods.at(-1) ?? null };
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateCapabilityScore(input: {
  homepageStatus: number | null;
  sitemapLocCount: number;
  listingLocCount: number;
  listingLinkCount: number;
  schemaTypes: string[];
  cms: CmsFamily;
  wpJsonPublic: boolean;
  explicitFeedCount: number;
  explicitRestCount: number;
}): number {
  let score = 0;
  if (input.homepageStatus != null && input.homepageStatus >= 200 && input.homepageStatus < 400) score += 15;
  if (input.sitemapLocCount > 0) score += 20;
  if (input.listingLocCount > 0) score += 15;
  if (input.listingLinkCount > 0) score += 10;
  if (input.schemaTypes.length > 0) score += 15;
  if (input.cms === "WORDPRESS") score += 8;
  if (input.cms === "HOUZEZ" || input.cms === "REALHOMES") score += 15;
  if (input.wpJsonPublic) score += 10;
  if (input.explicitFeedCount > 0) score += 5;
  if (input.explicitRestCount > 0) score += 5;
  return boundedScore(score);
}

export function chooseTechnicalGate(input: {
  robotsStatus: TechnicalCapabilityAudit["robots"]["status"];
  disallowAll: boolean;
  homepageStatus: number | null;
  noindex: boolean;
  accessControlSignal: boolean;
}): TechnicalGate {
  if (input.robotsStatus === "BLOCKED") return "REVIEW_ONLY_ROBOTS_BLOCK";
  if (input.robotsStatus === "UNAVAILABLE") return "REVIEW_ONLY_ROBOTS_UNAVAILABLE";
  if (input.disallowAll) return "REVIEW_ONLY_ROBOTS_BLOCK";
  if (input.homepageStatus == null || input.homepageStatus < 200 || input.homepageStatus >= 400) return "REVIEW_ONLY_HOMEPAGE_UNAVAILABLE";
  if (input.accessControlSignal) return "REVIEW_ONLY_ACCESS_CONTROL";
  if (input.noindex) return "REVIEW_ONLY_NOINDEX";
  return "CAPABILITY_REVIEW_READY";
}

export function chooseConnectorFamily(input: {
  gate: TechnicalGate;
  cms: CmsFamily;
  wpJsonPublic: boolean;
  explicitFeedCount: number;
  explicitRestCount: number;
  sitemapLocCount: number;
  listingLocCount: number;
  listingLinkCount: number;
  schemaTypes: string[];
}): ConnectorFamilyCandidate {
  if (input.gate !== "CAPABILITY_REVIEW_READY" && input.gate !== "REVIEW_ONLY_NOINDEX") return "BLOCKED_OR_INACCESSIBLE";
  if (input.cms === "HOUZEZ") return "WORDPRESS_HOUZEZ";
  if (input.cms === "REALHOMES") return "WORDPRESS_REALHOMES";
  if (input.cms === "WORDPRESS" && input.wpJsonPublic) return "WORDPRESS_GENERIC";
  if (input.explicitFeedCount > 0) return "PUBLIC_FEED_DISCOVERED";
  if (input.explicitRestCount > 0) return "PUBLIC_REST_DISCOVERED";
  if (input.sitemapLocCount > 0 && input.schemaTypes.length > 0) return "SITEMAP_JSONLD";
  if (input.listingLocCount > 0) return "SITEMAP_STRUCTURED_HTML";
  if (input.listingLinkCount > 0) return "STRUCTURED_HTML";
  return "MANUAL_REVIEW_CUSTOM";
}

export function buildTechnicalAudit(input: {
  seed: CandidateSeed;
  generatedAt: string;
  requestCount: number;
  robotsEvidence: HttpEvidence;
  robotsStatus: TechnicalCapabilityAudit["robots"]["status"];
  parsedRobots: ParsedRobots | null;
  homepageEvidence: HttpEvidence | null;
  homepageHtml: string;
  homepageHeaders?: Record<string, string>;
  sitemapEvidence: HttpEvidence[];
  sitemapBodies: string[];
  wpJsonEvidence: HttpEvidence | null;
  wpJsonBody: string;
}): TechnicalCapabilityAudit {
  const parsedRobots = input.parsedRobots;
  const disallowAll = parsedRobots ? robotsDisallowAll(parsedRobots) : false;
  const homepageHeaders = input.homepageHeaders ?? {};
  const baseUrl = input.homepageEvidence?.finalUrl ?? `https://${input.seed.domain}/`;
  const homepageSignals = extractHomepageSignals(input.homepageHtml, baseUrl);
  const noindex = detectNoindex(input.homepageHtml, homepageHeaders);
  const accessControlSignal = detectAccessControl(input.homepageHtml, input.homepageEvidence?.finalUrl ?? null);
  const schemaTypes = extractJsonLdSchemaTypes(input.homepageHtml);
  const cms = detectCmsFamily(input.homepageHtml, homepageHeaders);
  const sitemapSignals = input.sitemapBodies.map(extractSitemapSignals);
  const sitemapLocCount = sitemapSignals.reduce((sum, item) => sum + item.locCount, 0);
  const listingLocCount = sitemapSignals.reduce((sum, item) => sum + item.listingLocCount, 0);
  const latestLastmod = sitemapSignals.flatMap((item) => item.latestLastmod ? [item.latestLastmod] : []).sort().at(-1) ?? null;

  let wpJsonPublic = false;
  let routeCount = 0;
  if (input.wpJsonEvidence?.status === 200 && input.wpJsonBody) {
    try {
      const parsed = JSON.parse(input.wpJsonBody) as { routes?: Record<string, unknown> };
      routeCount = parsed.routes && typeof parsed.routes === "object" ? Object.keys(parsed.routes).length : 0;
      wpJsonPublic = routeCount > 0;
    } catch {
      wpJsonPublic = false;
    }
  }

  const gate = chooseTechnicalGate({
    robotsStatus: input.robotsStatus,
    disallowAll,
    homepageStatus: input.homepageEvidence?.status ?? null,
    noindex,
    accessControlSignal,
  });
  const capabilityScore = calculateCapabilityScore({
    homepageStatus: input.homepageEvidence?.status ?? null,
    sitemapLocCount,
    listingLocCount,
    listingLinkCount: homepageSignals.listingLinkCount,
    schemaTypes,
    cms,
    wpJsonPublic,
    explicitFeedCount: homepageSignals.explicitFeedUrls.length,
    explicitRestCount: homepageSignals.explicitRestUrls.length,
  });
  const connectorFamilyCandidate = chooseConnectorFamily({
    gate,
    cms,
    wpJsonPublic,
    explicitFeedCount: homepageSignals.explicitFeedUrls.length,
    explicitRestCount: homepageSignals.explicitRestUrls.length,
    sitemapLocCount,
    listingLocCount,
    listingLinkCount: homepageSignals.listingLinkCount,
    schemaTypes,
  });

  return {
    seed: input.seed,
    generatedAt: new Date(input.generatedAt).toISOString(),
    requestCount: input.requestCount,
    robots: {
      evidence: input.robotsEvidence,
      status: input.robotsStatus,
      disallowAll,
      sitemapUrls: parsedRobots?.sitemapUrls ?? [],
    },
    homepage: {
      evidence: input.homepageEvidence,
      title: homepageSignals.title,
      noindex,
      accessControlSignal,
      listingLinkCount: homepageSignals.listingLinkCount,
      explicitFeedUrls: homepageSignals.explicitFeedUrls,
      explicitRestUrls: homepageSignals.explicitRestUrls,
    },
    sitemaps: { fetched: input.sitemapEvidence, locCount: sitemapLocCount, listingLocCount, latestLastmod },
    structuredData: { hasJsonLd: /application\/ld\+json/i.test(input.homepageHtml), schemaTypes },
    cms,
    wpJson: { evidence: input.wpJsonEvidence, public: wpJsonPublic, routeCount },
    capabilityScore,
    connectorFamilyCandidate,
    technicalGate: gate,
    effectivePolicyCandidate: null,
  };
}

export function renderTechnicalAuditMarkdown(audits: TechnicalCapabilityAudit[]): string {
  const sorted = [...audits].sort((a, b) => b.capabilityScore - a.capabilityScore || a.seed.rank - b.seed.rank);
  const counts = <T extends string>(values: T[]) => [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length] as const);
  const lines = [
    "# DATA-1.5 — Candidate Technical Capability Audit",
    "",
    "Capability evidence only. **This report does not assign source policy, authorization, ingestion rights, or display rights.**",
    "",
    `Audited domains: **${audits.length}**`,
    "",
    "## Connector-family candidates",
    "",
    ...counts(audits.map((audit) => audit.connectorFamilyCandidate)).map(([name, count]) => `- ${name}: **${count}**`),
    "",
    "## Technical gates",
    "",
    ...counts(audits.map((audit) => audit.technicalGate)).map(([name, count]) => `- ${name}: **${count}**`),
    "",
    "## Ranked capability review",
    "",
    "| # | Domain | Score | CMS | Connector candidate | Gate | Sitemap URLs | Listing URLs | JSON-LD | WP REST | Requests |",
    "|---:|---|---:|---|---|---|---:|---:|---|---|---:|",
    ...sorted.map((audit, index) => `| ${index + 1} | ${audit.seed.domain} | ${audit.capabilityScore} | ${audit.cms} | ${audit.connectorFamilyCandidate} | ${audit.technicalGate} | ${audit.sitemaps.locCount} | ${audit.sitemaps.listingLocCount + audit.homepage.listingLinkCount} | ${audit.structuredData.hasJsonLd ? "yes" : "no"} | ${audit.wpJson.public ? "yes" : "no"} | ${audit.requestCount} |`),
    "",
    "## Gate",
    "",
    "Every candidate remains `effectivePolicyCandidate=null`. Robots/noindex/access-control evidence is a stop/review signal, never something to bypass.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

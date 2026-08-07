import { ALL_ACQUISITION_CITIES } from "@/lib/openserp-ingestion/national-geography";

export const COMMON_CRAWL_URL_INDEX_TABLE = '"ccindex"."ccindex"';
export const DEFAULT_COMMON_CRAWL_INDEX = "CC-MAIN-2026-25";

export type CommonCrawlDiscoveryLane = "MA_TLD_REAL_ESTATE" | "MOROCCO_EXTERNAL_REAL_ESTATE";

export type CommonCrawlUrlIndexQueryOptions = {
  crawl?: string;
  minSignalPages?: number;
};

export type CommonCrawlUrlIndexAggregateRow = {
  lane: CommonCrawlDiscoveryLane;
  domain: string;
  registered_domain: string;
  indexed_pages: number;
  real_estate_signal_pages: number;
  latest_fetch_at: string | null;
  sample_url: string;
};

export type CommonCrawlUrlIndexCandidate = {
  lane: CommonCrawlDiscoveryLane;
  domain: string;
  registeredDomain: string;
  indexedPages: number;
  realEstateSignalPages: number;
  latestFetchAt: string | null;
  sampleUrl: string;
  censusState: "KNOWN_TO_CENSUS" | "NEW_TO_CENSUS";
  reviewState: "UNREVIEWED";
  effectivePolicy: null;
};

export type CommonCrawlUrlIndexReport = {
  schemaVersion: "data-1-commoncrawl-url-index-v1";
  generatedAt: string;
  crawl: string;
  rows: number;
  domains: number;
  knownDomains: number;
  newDomains: number;
  candidates: CommonCrawlUrlIndexCandidate[];
};

const REAL_ESTATE_TERMS = [
  "immo",
  "immobilier",
  "appartement",
  "apartment",
  "villa",
  "maison",
  "house",
  "terrain",
  "land",
  "riad",
  "studio",
  "duplex",
  "bureau",
  "office",
  "local-commercial",
  "localcommercial",
  "vente",
  "vendre",
  "sale",
  "location",
  "louer",
  "rent",
  "property",
  "properties",
  "real-estate",
  "realestate",
  "residence",
];

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugRegexToken(value: string): string {
  return regexEscape(stripDiacritics(value).toLowerCase())
    .replace(/[’']/g, "")
    .replace(/\s+/g, "[-_/. ]*");
}

export function buildRealEstateUrlRegex(): string {
  const terms = REAL_ESTATE_TERMS.map(regexEscape).sort((a, b) => b.length - a.length);
  return `(?:^|[^a-z])(?:${terms.join("|")})(?:[^a-z]|$)`;
}

export function buildMoroccoLocationUrlRegex(): string {
  // "Salé" normalizes to "sale", which collides with the English real-estate
  // transaction word "sale". Excluding this one ambiguous Latin token avoids
  // turning every global `/sale/` URL into a Morocco signal. Country markers,
  // Rabat and the other national cities still cover discovery around Salé.
  const cityTerms = ALL_ACQUISITION_CITIES
    .map(slugRegexToken)
    .filter((token) => token !== "sale");
  const terms = ["morocco", "maroc", ...cityTerms];
  return `(?:^|[^a-z])(?:${[...new Set(terms)].join("|")})(?:[^a-z]|$)`;
}

function assertCrawl(value: string): string {
  if (!/^CC-MAIN-\d{4}-\d{2}$/.test(value)) {
    throw new Error(`Invalid Common Crawl index: ${value}`);
  }
  return value;
}

function assertPositiveInteger(value: number, name: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  }
  return value;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function urlSignalExpression(): string {
  return "lower(concat(coalesce(url_host_name, ''), '/', coalesce(url_path, '')))";
}

export function buildMaTldRealEstateQuery(options: CommonCrawlUrlIndexQueryOptions = {}): string {
  const crawl = assertCrawl(options.crawl ?? DEFAULT_COMMON_CRAWL_INDEX);
  const minSignalPages = assertPositiveInteger(options.minSignalPages ?? 1, "minSignalPages", 1_000_000);
  const signal = urlSignalExpression();
  const realEstateRegex = sqlLiteral(buildRealEstateUrlRegex());

  return `-- DATA-1.3 lane A: Morocco ccTLD discovery only. No WARC/content fetch.\nWITH scoped AS (\n  SELECT\n    url_host_name AS domain,\n    url_host_registered_domain AS registered_domain,\n    url,\n    fetch_time,\n    regexp_like(${signal}, ${realEstateRegex}) AS real_estate_signal\n  FROM ${COMMON_CRAWL_URL_INDEX_TABLE}\n  WHERE crawl = ${sqlLiteral(crawl)}\n    AND subset = 'warc'\n    AND fetch_status = 200\n    AND url_host_registry_suffix = 'ma'\n    AND url_host_name IS NOT NULL\n    AND url_host_registered_domain IS NOT NULL\n), aggregated AS (\n  SELECT\n    domain,\n    registered_domain,\n    count(*) AS indexed_pages,\n    count_if(real_estate_signal) AS real_estate_signal_pages,\n    max(fetch_time) AS latest_fetch_at,\n    max_by(url, fetch_time) AS sample_url\n  FROM scoped\n  GROUP BY domain, registered_domain\n)\nSELECT\n  'MA_TLD_REAL_ESTATE' AS lane,\n  domain,\n  registered_domain,\n  indexed_pages,\n  real_estate_signal_pages,\n  latest_fetch_at,\n  sample_url\nFROM aggregated\nWHERE real_estate_signal_pages >= ${minSignalPages}\nORDER BY real_estate_signal_pages DESC, indexed_pages DESC, domain ASC;\n`;
}

export function buildMoroccoExternalRealEstateQuery(options: CommonCrawlUrlIndexQueryOptions = {}): string {
  const crawl = assertCrawl(options.crawl ?? DEFAULT_COMMON_CRAWL_INDEX);
  const minSignalPages = assertPositiveInteger(options.minSignalPages ?? 1, "minSignalPages", 1_000_000);
  const signal = urlSignalExpression();
  const realEstateRegex = sqlLiteral(buildRealEstateUrlRegex());
  const locationRegex = sqlLiteral(buildMoroccoLocationUrlRegex());

  return `-- DATA-1.3 lane B: non-.ma Morocco real-estate discovery only. No WARC/content fetch.\nWITH scoped AS (\n  SELECT\n    url_host_name AS domain,\n    url_host_registered_domain AS registered_domain,\n    url,\n    fetch_time\n  FROM ${COMMON_CRAWL_URL_INDEX_TABLE}\n  WHERE crawl = ${sqlLiteral(crawl)}\n    AND subset = 'warc'\n    AND fetch_status = 200\n    AND url_host_registry_suffix <> 'ma'\n    AND url_host_name IS NOT NULL\n    AND url_host_registered_domain IS NOT NULL\n    AND regexp_like(${signal}, ${realEstateRegex})\n    AND regexp_like(${signal}, ${locationRegex})\n), aggregated AS (\n  SELECT\n    domain,\n    registered_domain,\n    count(*) AS indexed_pages,\n    count(*) AS real_estate_signal_pages,\n    max(fetch_time) AS latest_fetch_at,\n    max_by(url, fetch_time) AS sample_url\n  FROM scoped\n  GROUP BY domain, registered_domain\n)\nSELECT\n  'MOROCCO_EXTERNAL_REAL_ESTATE' AS lane,\n  domain,\n  registered_domain,\n  indexed_pages,\n  real_estate_signal_pages,\n  latest_fetch_at,\n  sample_url\nFROM aggregated\nWHERE real_estate_signal_pages >= ${minSignalPages}\nORDER BY real_estate_signal_pages DESC, indexed_pages DESC, domain ASC;\n`;
}

function normalizeDomain(value: string, field: string): string {
  const domain = value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!domain || !domain.includes(".")) throw new Error(`${field} is invalid: ${value}`);
  return domain;
}

function parseCount(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function parseTimestamp(value: string | null): string | null {
  if (value == null || value === "") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid latest_fetch_at: ${value}`);
  return new Date(timestamp).toISOString();
}

export function buildCommonCrawlUrlIndexReport(
  rows: CommonCrawlUrlIndexAggregateRow[],
  knownDomains: Iterable<string>,
  generatedAt: string,
  crawl = DEFAULT_COMMON_CRAWL_INDEX,
): CommonCrawlUrlIndexReport {
  const canonicalCrawl = assertCrawl(crawl);
  const generatedTimestamp = parseTimestamp(generatedAt);
  if (!generatedTimestamp) throw new Error("generatedAt is required");

  const known = new Set([...knownDomains].map((domain) => normalizeDomain(domain, "known domain")));
  const candidatesByDomain = new Map<string, CommonCrawlUrlIndexCandidate>();

  for (const row of rows) {
    if (row.lane !== "MA_TLD_REAL_ESTATE" && row.lane !== "MOROCCO_EXTERNAL_REAL_ESTATE") {
      throw new Error(`Unsupported discovery lane: ${String(row.lane)}`);
    }

    const domain = normalizeDomain(row.domain, "domain");
    const registeredDomain = normalizeDomain(row.registered_domain, "registered_domain");
    const sampleUrl = new URL(row.sample_url);
    const sampleHost = normalizeDomain(sampleUrl.hostname, "sample_url hostname");
    if (sampleHost !== domain) {
      throw new Error(`sample_url hostname ${sampleHost} does not match domain ${domain}`);
    }

    const indexedPages = parseCount(row.indexed_pages, "indexed_pages");
    const signalPages = parseCount(row.real_estate_signal_pages, "real_estate_signal_pages");
    if (signalPages > indexedPages) {
      throw new Error(`real_estate_signal_pages exceeds indexed_pages for ${domain}`);
    }

    const candidate: CommonCrawlUrlIndexCandidate = {
      lane: row.lane,
      domain,
      registeredDomain,
      indexedPages,
      realEstateSignalPages: signalPages,
      latestFetchAt: parseTimestamp(row.latest_fetch_at),
      sampleUrl: sampleUrl.toString(),
      censusState: known.has(domain) || known.has(registeredDomain) ? "KNOWN_TO_CENSUS" : "NEW_TO_CENSUS",
      reviewState: "UNREVIEWED",
      effectivePolicy: null,
    };

    const existing = candidatesByDomain.get(domain);
    if (!existing) {
      candidatesByDomain.set(domain, candidate);
      continue;
    }

    // Same host may be surfaced by both lanes only if an upstream export is malformed.
    // Fail closed instead of merging evidence from incompatible scopes silently.
    if (existing.lane !== candidate.lane || existing.registeredDomain !== candidate.registeredDomain) {
      throw new Error(`Conflicting Common Crawl aggregate evidence for ${domain}`);
    }

    existing.indexedPages += candidate.indexedPages;
    existing.realEstateSignalPages += candidate.realEstateSignalPages;
    if ((candidate.latestFetchAt ?? "") > (existing.latestFetchAt ?? "")) {
      existing.latestFetchAt = candidate.latestFetchAt;
      existing.sampleUrl = candidate.sampleUrl;
    }
  }

  const candidates = [...candidatesByDomain.values()].sort(
    (a, b) =>
      Number(a.censusState === "KNOWN_TO_CENSUS") - Number(b.censusState === "KNOWN_TO_CENSUS") ||
      b.realEstateSignalPages - a.realEstateSignalPages ||
      b.indexedPages - a.indexedPages ||
      a.domain.localeCompare(b.domain),
  );

  return {
    schemaVersion: "data-1-commoncrawl-url-index-v1",
    generatedAt: generatedTimestamp,
    crawl: canonicalCrawl,
    rows: rows.length,
    domains: candidates.length,
    knownDomains: candidates.filter((candidate) => candidate.censusState === "KNOWN_TO_CENSUS").length,
    newDomains: candidates.filter((candidate) => candidate.censusState === "NEW_TO_CENSUS").length,
    candidates,
  };
}

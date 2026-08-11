import fs from "node:fs/promises";
import path from "node:path";
import {
  rankDomainReservoirs,
  summarizeDomainReservoir,
  type RegistryPolicySnapshot,
  type ReservoirCandidate,
} from "../data-mass/reservoir-qualification";

const OUT_DIR = process.env.DATA_MASS_1_OUT_DIR ?? ".tmp/data-mass-1/results";
const TIMEOUT_MS = 20_000;
const PAGE_SIZE = 1_000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-MASS-1 requires ${name}`);
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
  if (!response.ok) {
    throw new Error(`${table} read failed: HTTP ${response.status} ${await response.text()}`);
  }
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

type DiscoveryRow = {
  source_domain: string;
  source_url: string;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_query: string | null;
  content_fingerprint: string | null;
  last_seen_at: string | null;
};

type ThinIndexRow = { canonical_url: string };
type RegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  display_policy: string | null;
  display_gate: string | null;
  acquisition_mode: string | null;
  ingestion_gate: string | null;
};

function normalizedDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function canonicalKey(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pct(value: number): string {
  return `${(100 * value).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const [discoveryRows, thinRows, registryRows] = await Promise.all([
    restAll<DiscoveryRow>("discovery_candidates", {
      select: "source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at",
      order: "source_domain.asc,source_url.asc",
    }),
    restAll<ThinIndexRow>("thin_index_search_documents", {
      select: "canonical_url",
      order: "canonical_url.asc",
    }),
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,authorization_status,display_policy,display_gate,acquisition_mode,ingestion_gate",
      order: "source_domain.asc",
    }),
  ]);

  const thinUrls = new Set(thinRows.map((row) => canonicalKey(row.canonical_url)));
  const registry = new Map<string, RegistryPolicySnapshot>();
  for (const row of registryRows) {
    const sourceDomain = normalizedDomain(row.source_domain);
    registry.set(sourceDomain, {
      sourceDomain,
      authorizationStatus: row.authorization_status,
      displayPolicy: row.display_policy,
      displayGate: row.display_gate,
      acquisitionMode: row.acquisition_mode,
      ingestionGate: row.ingestion_gate,
    });
  }

  // MASS-1 is representation qualification, not property deduplication. We collapse only exact
  // canonical/source URL repetitions so one discovered URL representation is counted once.
  const uniqueDiscovery = new Map<string, DiscoveryRow>();
  for (const row of discoveryRows) {
    const rawUrl = row.canonical_url || row.source_url;
    if (!rawUrl) continue;
    const key = canonicalKey(rawUrl);
    const existing = uniqueDiscovery.get(key);
    if (!existing || (row.last_seen_at ?? "") > (existing.last_seen_at ?? "")) uniqueDiscovery.set(key, row);
  }

  const netNewByDomain = new Map<string, ReservoirCandidate[]>();
  for (const [urlKey, row] of uniqueDiscovery) {
    if (thinUrls.has(urlKey)) continue;
    const sourceDomain = normalizedDomain(row.source_domain || (() => {
      try { return new URL(urlKey).hostname; } catch { return "unknown"; }
    })());
    const list = netNewByDomain.get(sourceDomain) ?? [];
    list.push({
      sourceDomain,
      url: urlKey,
      title: row.title,
      snippet: row.snippet,
      discoveryQuery: row.discovery_query,
      contentFingerprint: row.content_fingerprint,
    });
    netNewByDomain.set(sourceDomain, list);
  }

  const summaries = rankDomainReservoirs(
    [...netNewByDomain.entries()].map(([domain, candidates]) =>
      summarizeDomainReservoir(domain, candidates, registry.get(domain) ?? null),
    ),
  );

  const queueCounts = summaries.reduce<Record<string, { domains: number; urls: number; likelyRealEstate: number; likelyDetail: number }>>((acc, row) => {
    const current = acc[row.massQueue] ?? { domains: 0, urls: 0, likelyRealEstate: 0, likelyDetail: 0 };
    current.domains += 1;
    current.urls += row.urlRepresentations;
    current.likelyRealEstate += row.likelyRealEstateUrls;
    current.likelyDetail += row.likelyListingDetailUrls;
    acc[row.massQueue] = current;
    return acc;
  }, {});

  const sourceFactory = summaries.filter((row) => row.massQueue === "SOURCE_FACTORY");
  const policyCompatibleTail = summaries.filter((row) => row.massQueue === "POLICY_COMPATIBLE_TAIL");
  const transportLeakage = sourceFactory.filter((row) => row.domainRole === "DISCOVERY_TRANSPORT");
  const socialLeakage = sourceFactory.filter((row) => row.domainRole === "SOCIAL");
  const netNewUrlRepresentations = summaries.reduce((sum, row) => sum + row.urlRepresentations, 0);
  const likelyRealEstateUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyRealEstateUrls, 0);
  const likelyListingDetailUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyListingDetailUrls, 0);
  const duplicateSignalRows = summaries.reduce((sum, row) => sum + row.duplicateSignalRows, 0);

  const proof = {
    schemaVersion: "data-mass-1-reservoir-qualification-v1",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    databaseWrites: 0,
    ddlChanges: 0,
    policyChanges: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    publicRowsCreated: 0,
    uniquePropertiesClaimed: 0,
    unitOfCount: "URL_REPRESENTATION",
    discoveryRowsRead: discoveryRows.length,
    distinctDiscoveryUrlRepresentations: uniqueDiscovery.size,
    thinIndexUrlRepresentationsRead: thinRows.length,
    registryRowsRead: registryRows.length,
    exactUrlRepetitionsCollapsed: discoveryRows.length - uniqueDiscovery.size,
    netNewUrlRepresentations,
    netNewDomains: summaries.length,
    likelyRealEstateUrlRepresentations,
    likelyListingDetailUrlRepresentations,
    duplicateSignalRows,
    sourceFactoryCandidateDomains: sourceFactory.length,
    sourceFactoryCandidateUrlRepresentations: sourceFactory.reduce((sum, row) => sum + row.urlRepresentations, 0),
    policyCompatibleTailDomains: policyCompatibleTail.length,
    policyCompatibleTailUrlRepresentations: policyCompatibleTail.reduce((sum, row) => sum + row.urlRepresentations, 0),
    transportLeakageIntoSourceFactory: transportLeakage.length,
    socialLeakageIntoSourceFactory: socialLeakage.length,
    queueCounts,
    topSourceFactoryDomains: sourceFactory.slice(0, 20).map((row) => row.sourceDomain),
  };

  const top50 = summaries.slice(0, 50);
  const report = {
    proof,
    truthBoundary: {
      urlRepresentationsAreNotUniqueProperties: true,
      likelyRealEstateIsHeuristicOnly: true,
      likelyListingDetailIsHeuristicOnly: true,
      sourceRegistryRemainsAuthoritative: true,
      mass1GrantsNoAuthorization: true,
      duplicateSignalIsNotPropertyDeduplication: true,
    },
    sourceFactory,
    policyCompatibleTail,
    allDomains: summaries,
  };

  const csvHeader = [
    "source_domain", "domain_role", "mass_queue", "mass_potential_score", "url_representations",
    "likely_real_estate_urls", "real_estate_share", "likely_listing_detail_urls", "likely_detail_share",
    "category_or_search_urls", "ambiguous_urls", "non_real_estate_urls", "duplicate_signal_rows",
    "duplicate_signal_ratio", "registry_status", "authorization_status", "display_policy", "display_gate",
    "acquisition_mode", "ingestion_gate", "public_activable_now", "recommended_next_action",
  ];
  const csv = [
    csvHeader.join(","),
    ...summaries.map((row) => [
      row.sourceDomain, row.domainRole, row.massQueue, row.massPotentialScore, row.urlRepresentations,
      row.likelyRealEstateUrls, row.realEstateShare, row.likelyListingDetailUrls, row.likelyDetailShare,
      row.likelyCategoryOrSearchUrls, row.ambiguousUrls, row.nonRealEstateUrls, row.duplicateSignalRows,
      row.duplicateSignalRatio, row.registryStatus, row.authorizationStatus, row.displayPolicy, row.displayGate,
      row.acquisitionMode, row.ingestionGate, row.publicActivableNow, row.recommendedNextAction,
    ].map(csvCell).join(",")),
  ].join("\n");

  const markdown = [
    "# DATA MASS-1 — Reservoir Qualification",
    "",
    `Generated: ${proof.generatedAt}`,
    "",
    "## Truth boundary",
    "",
    "- Unit = URL representation, never unique property.",
    "- Likely-real-estate and likely-detail are deterministic qualification signals only.",
    "- MASS-1 does not fetch source pages, mutate Registry policy, ingest listings or activate Search.",
    "- Duplicate signal is representation-level evidence only; it is not property deduplication.",
    "",
    "## Snapshot",
    "",
    `- Discovery rows read: **${proof.discoveryRowsRead.toLocaleString("en-US")}**`,
    `- Distinct discovered URL representations: **${proof.distinctDiscoveryUrlRepresentations.toLocaleString("en-US")}**`,
    `- Thin Index URL representations: **${proof.thinIndexUrlRepresentationsRead.toLocaleString("en-US")}**`,
    `- Net-new URL representations: **${proof.netNewUrlRepresentations.toLocaleString("en-US")}**`,
    `- Net-new domains: **${proof.netNewDomains.toLocaleString("en-US")}**`,
    `- Likely real-estate representations: **${proof.likelyRealEstateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Likely listing-detail representations: **${proof.likelyListingDetailUrlRepresentations.toLocaleString("en-US")}**`,
    `- Source Factory candidate domains: **${proof.sourceFactoryCandidateDomains.toLocaleString("en-US")}**`,
    `- Source Factory candidate URL representations: **${proof.sourceFactoryCandidateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Policy-compatible tail domains: **${proof.policyCompatibleTailDomains}**`,
    `- Transport/social leakage into Source Factory: **${proof.transportLeakageIntoSourceFactory}/${proof.socialLeakageIntoSourceFactory}**`,
    "",
    "## Top 50 MASS domains",
    "",
    "| # | Domain | Role | Queue | URLs | RE | Detail | Dup signal | Score | Registry |",
    "|---:|---|---|---|---:|---:|---:|---:|---:|---|",
    ...top50.map((row, index) => `| ${index + 1} | ${row.sourceDomain} | ${row.domainRole} | ${row.massQueue} | ${row.urlRepresentations} | ${pct(row.realEstateShare)} | ${pct(row.likelyDetailShare)} | ${pct(row.duplicateSignalRatio)} | ${row.massPotentialScore.toFixed(2)} | ${row.registryStatus} |`),
    "",
  ].join("\n");

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "domains.csv"), `${csv}\n`),
    fs.writeFile(path.join(OUT_DIR, "summary.md"), `${markdown}\n`),
  ]);

  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

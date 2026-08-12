import fs from "node:fs/promises";
import path from "node:path";
import {
  rankDomainReservoirs,
  summarizeDomainReservoir,
  type RegistryPolicySnapshot,
  type ReservoirCandidate,
} from "../data-mass/reservoir-qualification";

const OUT_DIR = process.env.DATA_MASS_1_OUT_DIR ?? ".tmp/data-mass-1/results";
const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 1_000;
const MAX_RETRIES = 3;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-MASS-1 requires ${name}`);
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return (await response.json()) as T[];

    const body = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`${table} read failed: HTTP ${response.status} ${body}`);
    }
    await delay(250 * attempt);
  }

  throw new Error(`${table} read failed after ${MAX_RETRIES} attempts`);
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function restAllById<T extends { id: string }>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  let lastId: string | null = null;

  for (;;) {
    const query: Record<string, string> = { ...params, order: "id.asc", limit: String(PAGE_SIZE) };
    if (lastId) query.id = `gt.${lastId}`;
    const page = await restPage<T>(table, query);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    const nextId = page.at(-1)?.id ?? null;
    if (!nextId || nextId === lastId) throw new Error(`${table} keyset pagination did not advance`);
    lastId = nextId;
  }
}

type DiscoveryRow = {
  id: string;
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
    restAllById<DiscoveryRow>("discovery_candidates", {
      select: "id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at",
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

  // Representation qualification only: exact canonical/source URL repetitions are collapsed.
  // No claim is made that distinct URLs correspond to distinct properties.
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

  const queueCounts = summaries.reduce<Record<string, { domains: number; urls: number; likelyRealEstate: number; likelyMoroccoRealEstate: number; likelyMoroccoDetail: number }>>((acc, row) => {
    const current = acc[row.massQueue] ?? { domains: 0, urls: 0, likelyRealEstate: 0, likelyMoroccoRealEstate: 0, likelyMoroccoDetail: 0 };
    current.domains += 1;
    current.urls += row.urlRepresentations;
    current.likelyRealEstate += row.likelyRealEstateUrls;
    current.likelyMoroccoRealEstate += row.likelyMoroccoRealEstateUrls;
    current.likelyMoroccoDetail += row.likelyMoroccoListingDetailUrls;
    acc[row.massQueue] = current;
    return acc;
  }, {});

  const sourceFactory = summaries.filter((row) => row.massQueue === "SOURCE_FACTORY");
  const policyCompatibleTail = summaries.filter((row) => row.massQueue === "POLICY_COMPATIBLE_TAIL");
  const transportLeakage = sourceFactory.filter((row) => row.domainRole === "DISCOVERY_TRANSPORT");
  const socialLeakage = sourceFactory.filter((row) => row.domainRole === "SOCIAL");
  const foreignOnlyLeakage = sourceFactory.filter((row) => row.likelyMoroccoRealEstateUrls === 0);
  const weakMoroccoLeakage = sourceFactory.filter((row) => row.likelyMoroccoRealEstateUrls < 20 || row.moroccoShareOfRealEstate < 0.1);

  const netNewUrlRepresentations = summaries.reduce((sum, row) => sum + row.urlRepresentations, 0);
  const likelyRealEstateUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyRealEstateUrls, 0);
  const likelyListingDetailUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyListingDetailUrls, 0);
  const likelyMoroccoRealEstateUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyMoroccoRealEstateUrls, 0);
  const likelyMoroccoListingDetailUrlRepresentations = summaries.reduce((sum, row) => sum + row.likelyMoroccoListingDetailUrls, 0);
  const duplicateSignalRows = summaries.reduce((sum, row) => sum + row.duplicateSignalRows, 0);
  const saleLikelyMoroccoUrlRepresentations = summaries.reduce((sum, row) => sum + row.saleLikelyMoroccoUrls, 0);
  const rentLikelyMoroccoUrlRepresentations = summaries.reduce((sum, row) => sum + row.rentLikelyMoroccoUrls, 0);
  const bothTransactionLikelyMoroccoUrlRepresentations = summaries.reduce((sum, row) => sum + row.bothTransactionLikelyMoroccoUrls, 0);
  const unknownTransactionLikelyMoroccoUrlRepresentations = summaries.reduce((sum, row) => sum + row.unknownTransactionLikelyMoroccoUrls, 0);

  const globalCityCounts = new Map<string, number>();
  for (const row of summaries) {
    for (const city of row.detectedCities) {
      globalCityCounts.set(city.city, (globalCityCounts.get(city.city) ?? 0) + city.urlRepresentations);
    }
  }
  const detectedCities = [...globalCityCounts.entries()]
    .map(([city, urlRepresentations]) => ({ city, urlRepresentations }))
    .sort((a, b) => b.urlRepresentations - a.urlRepresentations || a.city.localeCompare(b.city));

  const proof = {
    schemaVersion: "data-mass-1-reservoir-qualification-v2",
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
    paginationMode: "UUID_KEYSET",
    transientReadRetriesBounded: MAX_RETRIES,
    discoveryRowsRead: discoveryRows.length,
    distinctDiscoveryUrlRepresentations: uniqueDiscovery.size,
    thinIndexUrlRepresentationsRead: thinRows.length,
    registryRowsRead: registryRows.length,
    exactUrlRepetitionsCollapsed: discoveryRows.length - uniqueDiscovery.size,
    netNewUrlRepresentations,
    netNewDomains: summaries.length,
    likelyRealEstateUrlRepresentations,
    likelyListingDetailUrlRepresentations,
    likelyMoroccoRealEstateUrlRepresentations,
    likelyMoroccoListingDetailUrlRepresentations,
    duplicateSignalRows,
    saleLikelyMoroccoUrlRepresentations,
    rentLikelyMoroccoUrlRepresentations,
    bothTransactionLikelyMoroccoUrlRepresentations,
    unknownTransactionLikelyMoroccoUrlRepresentations,
    detectedCities,
    sourceFactoryCandidateDomains: sourceFactory.length,
    sourceFactoryCandidateUrlRepresentations: sourceFactory.reduce((sum, row) => sum + row.urlRepresentations, 0),
    sourceFactoryLikelyMoroccoRealEstateUrlRepresentations: sourceFactory.reduce((sum, row) => sum + row.likelyMoroccoRealEstateUrls, 0),
    sourceFactoryLikelyMoroccoListingDetailUrlRepresentations: sourceFactory.reduce((sum, row) => sum + row.likelyMoroccoListingDetailUrls, 0),
    policyCompatibleTailDomains: policyCompatibleTail.length,
    policyCompatibleTailUrlRepresentations: policyCompatibleTail.reduce((sum, row) => sum + row.urlRepresentations, 0),
    transportLeakageIntoSourceFactory: transportLeakage.length,
    socialLeakageIntoSourceFactory: socialLeakage.length,
    foreignOnlyLeakageIntoSourceFactory: foreignOnlyLeakage.length,
    weakMoroccoLeakageIntoSourceFactory: weakMoroccoLeakage.length,
    queueCounts,
    topSourceFactoryDomains: sourceFactory.slice(0, 20).map((row) => ({
      sourceDomain: row.sourceDomain,
      massPotentialScore: row.massPotentialScore,
      urlRepresentations: row.urlRepresentations,
      likelyMoroccoRealEstateUrls: row.likelyMoroccoRealEstateUrls,
      likelyMoroccoListingDetailUrls: row.likelyMoroccoListingDetailUrls,
      moroccoShareOfRealEstate: row.moroccoShareOfRealEstate,
      detectedCities: row.detectedCities.slice(0, 5),
    })),
  };

  const top50 = summaries.slice(0, 50);
  const report = {
    proof,
    truthBoundary: {
      urlRepresentationsAreNotUniqueProperties: true,
      likelyRealEstateIsHeuristicOnly: true,
      likelyListingDetailIsHeuristicOnly: true,
      moroccoScopeIsHeuristicOnly: true,
      cityAndTransactionSignalsAreHeuristicOnly: true,
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
    "likely_real_estate_urls", "likely_morocco_real_estate_urls", "likely_morocco_listing_detail_urls",
    "morocco_share_of_real_estate", "likely_morocco_detail_share", "sale_morocco_urls", "rent_morocco_urls",
    "both_transaction_morocco_urls", "unknown_transaction_morocco_urls", "top_cities",
    "duplicate_signal_rows", "duplicate_signal_ratio", "registry_status", "authorization_status",
    "display_policy", "display_gate", "acquisition_mode", "ingestion_gate", "public_activable_now",
    "recommended_next_action",
  ];
  const csv = [
    csvHeader.join(","),
    ...summaries.map((row) => [
      row.sourceDomain, row.domainRole, row.massQueue, row.massPotentialScore, row.urlRepresentations,
      row.likelyRealEstateUrls, row.likelyMoroccoRealEstateUrls, row.likelyMoroccoListingDetailUrls,
      row.moroccoShareOfRealEstate, row.likelyMoroccoDetailShare, row.saleLikelyMoroccoUrls,
      row.rentLikelyMoroccoUrls, row.bothTransactionLikelyMoroccoUrls, row.unknownTransactionLikelyMoroccoUrls,
      row.detectedCities.slice(0, 8).map((city) => `${city.city}:${city.urlRepresentations}`).join("|"),
      row.duplicateSignalRows, row.duplicateSignalRatio, row.registryStatus, row.authorizationStatus,
      row.displayPolicy, row.displayGate, row.acquisitionMode, row.ingestionGate, row.publicActivableNow,
      row.recommendedNextAction,
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
    "- Real-estate, Morocco, city, transaction and detail signals are deterministic prioritization heuristics only.",
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
    `- Likely Morocco real-estate representations: **${proof.likelyMoroccoRealEstateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Likely Morocco listing-detail representations: **${proof.likelyMoroccoListingDetailUrlRepresentations.toLocaleString("en-US")}**`,
    `- Source Factory candidate domains: **${proof.sourceFactoryCandidateDomains.toLocaleString("en-US")}**`,
    `- Source Factory likely-Morocco RE representations: **${proof.sourceFactoryLikelyMoroccoRealEstateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Policy-compatible tail domains: **${proof.policyCompatibleTailDomains}**`,
    `- Transport/social/foreign-only/weak-Morocco leakage into Source Factory: **${proof.transportLeakageIntoSourceFactory}/${proof.socialLeakageIntoSourceFactory}/${proof.foreignOnlyLeakageIntoSourceFactory}/${proof.weakMoroccoLeakageIntoSourceFactory}**`,
    `- Transaction signals (sale / rent / both / unknown): **${proof.saleLikelyMoroccoUrlRepresentations.toLocaleString("en-US")} / ${proof.rentLikelyMoroccoUrlRepresentations.toLocaleString("en-US")} / ${proof.bothTransactionLikelyMoroccoUrlRepresentations.toLocaleString("en-US")} / ${proof.unknownTransactionLikelyMoroccoUrlRepresentations.toLocaleString("en-US")}**`,
    `- Top cities: **${detectedCities.slice(0, 10).map((city) => `${city.city} ${city.urlRepresentations.toLocaleString("en-US")}`).join(" · ")}**`,
    "",
    "## Top 50 MASS domains",
    "",
    "| # | Domain | Role | Queue | URLs | Morocco RE | Morocco detail | MA share | Sale | Rent | Top cities | Score | Registry |",
    "|---:|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|",
    ...top50.map((row, index) => `| ${index + 1} | ${row.sourceDomain} | ${row.domainRole} | ${row.massQueue} | ${row.urlRepresentations} | ${row.likelyMoroccoRealEstateUrls} | ${row.likelyMoroccoListingDetailUrls} | ${pct(row.moroccoShareOfRealEstate)} | ${row.saleLikelyMoroccoUrls} | ${row.rentLikelyMoroccoUrls} | ${row.detectedCities.slice(0, 3).map((city) => `${city.city}:${city.urlRepresentations}`).join(" · ") || "—"} | ${row.massPotentialScore.toFixed(2)} | ${row.registryStatus} |`),
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

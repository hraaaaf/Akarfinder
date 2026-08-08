import fs from "node:fs/promises";
import path from "node:path";
import {
  PROMOIMMO_CANARY_SIZE,
  PROMOIMMO_DOMAIN,
  PROMOIMMO_RUN_ID,
  buildPromoImmoCanaryPlan,
  canonicalizePromoImmoUrl,
  extractPromoImmoRobotsSitemaps,
  parsePromoImmoSitemapXml,
  registryAllowsPromoImmoCanary,
  samePromoImmoOrigin,
  selectPromoImmoCanary,
  type PromoImmoCandidate,
  type PromoImmoRegistryPolicy,
  type SeedSnapshot,
} from "../data4/promoimmo-sitemap-canary";

const OUT_DIR = process.env.DATA_4_4B_OUT_DIR ?? ".tmp/data-4-4b/results";
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK = 20;
const MAX_SOURCE_REQUESTS = 40;
const TIMEOUT_MS = 15_000;
let sourceRequests = 0;

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string | null;
  discovery_policy: string | null;
  display_policy: string | null;
  display_gate: string | null;
  machine_gate: string | null;
  allowed_discovery_channels: string[] | null;
  robots_status: string | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

type NormalizedRow = {
  canonical_url: string;
  freshness_status: string;
  normalization_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
  title: string | null;
  price_mad: number | string | null;
  surface_m2: number | string | null;
};

type DisplayRow = {
  canonical_url: string;
  quality_tier: string | null;
  quality_score: number | string | null;
  display_eligibility: string | null;
};

type PublicRow = {
  canonical_url: string;
  source_domain: string;
  title: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | string | null;
  normalized_surface_m2: number | string | null;
};

type SeedDbRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_last_seen_at: string | null;
  fresh_channels: string[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

type ListingSourceRow = {
  listing_url: string | null;
  property_listing_id: number | string;
};

type PropertyClusterRow = { id: string; legacy_property_listing_id: number | string | null };
type ClusterMemberRow = { property_cluster_id: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.4B requires ${name}`);
  return value;
}

function postgrestIn(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed: ${response.status} ${await response.text()}`);
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

async function fetchAllowedText(urlString: string): Promise<string> {
  if (!samePromoImmoOrigin(urlString)) throw new Error(`Disallowed Promo Immo URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.4B source request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.4B; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok || !samePromoImmoOrigin(response.url)) {
    throw new Error(`Promo Immo source read failed ${response.status}: ${urlString}`);
  }
  return response.text();
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedTitle(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function exactStructuredFingerprint(row: {
  title: string | null;
  city: string | null;
  propertyType: string | null;
  intent: string | null;
  price: number | string | null;
  surface: number | string | null;
}): string | null {
  const title = normalizedTitle(row.title);
  const price = numberOrNull(row.price);
  const surface = numberOrNull(row.surface);
  if (!title || !row.city || !row.propertyType || !row.intent || price === null || surface === null) return null;
  return JSON.stringify([title, row.city, row.propertyType, row.intent, price, surface]);
}

async function loadSeedStates(urls: string[]): Promise<SeedDbRow[]> {
  const rows: SeedDbRow[] = [];
  for (let i = 0; i < urls.length; i += LOOKUP_CHUNK) {
    const chunk = urls.slice(i, i + LOOKUP_CHUNK);
    rows.push(...await restPage<SeedDbRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
      canonical_url: postgrestIn(chunk),
      limit: String(chunk.length),
    }));
  }
  return rows;
}

async function loadListingSources(urls: string[]): Promise<ListingSourceRow[]> {
  const rows: ListingSourceRow[] = [];
  for (let i = 0; i < urls.length; i += LOOKUP_CHUNK) {
    const chunk = urls.slice(i, i + LOOKUP_CHUNK);
    rows.push(...await restPage<ListingSourceRow>("listing_sources", {
      select: "listing_url,property_listing_id",
      listing_url: postgrestIn(chunk),
      limit: String(chunk.length * 2),
    }));
  }
  return rows;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, normalizedRows, displayRows, allPublicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,robots_status,max_revalidation_interval_days,review_status",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,freshness_status,normalization_status,city,property_type,intent,title,price_mad,surface_m2",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
      order: "canonical_url.asc",
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,quality_tier,quality_score,display_eligibility",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
      order: "canonical_url.asc",
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url,source_domain,title,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2",
    }),
  ]);

  if (registryRows.length !== 1) throw new Error(`Expected one Promo Immo Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;
  const policy: PromoImmoRegistryPolicy = {
    sourceDomain: registry.source_domain,
    acquisitionMode: registry.acquisition_mode,
    discoveryPolicy: registry.discovery_policy,
    displayPolicy: registry.display_policy,
    displayGate: registry.display_gate,
    machineGate: registry.machine_gate,
    allowedDiscoveryChannels: registry.allowed_discovery_channels ?? [],
    robotsStatus: registry.robots_status,
    maxRevalidationIntervalDays: registry.max_revalidation_interval_days,
    reviewStatus: registry.review_status,
  };
  if (!registryAllowsPromoImmoCanary(policy)) throw new Error(`Promo Immo Registry gate failed: ${JSON.stringify(policy)}`);

  const robotsUrl = `https://${PROMOIMMO_DOMAIN}/robots.txt`;
  const robotsText = await fetchAllowedText(robotsUrl);
  const declaredSitemaps = extractPromoImmoRobotsSitemaps(robotsText);
  if (declaredSitemaps.length === 0) throw new Error("Promo Immo robots.txt declares no same-origin sitemap");

  const queue = [...declaredSitemaps];
  const visited = new Set<string>();
  const sitemapByCanonicalUrl = new Map<string, string>();
  while (queue.length > 0) {
    const rawSitemapUrl = queue.shift()!;
    const sitemapUrl = canonicalizePromoImmoUrl(rawSitemapUrl);
    if (!sitemapUrl || visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parsePromoImmoSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`Unknown Promo Immo sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) sitemapByCanonicalUrl.set(canonicalUrl, sitemapUrl);
    }
  }
  if (sitemapByCanonicalUrl.size === 0) throw new Error("Promo Immo sitemap URL population is empty");

  const publicPromoUrls = new Set(allPublicRows.filter((row) => row.source_domain === PROMOIMMO_DOMAIN).map((row) => row.canonical_url));
  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));

  const otherSourceFingerprints = new Set<string>();
  for (const row of allPublicRows) {
    if (row.source_domain === PROMOIMMO_DOMAIN) continue;
    const fingerprint = exactStructuredFingerprint({
      title: row.title,
      city: row.normalized_city,
      propertyType: row.normalized_property_type,
      intent: row.normalized_intent,
      price: row.normalized_price_mad,
      surface: row.normalized_surface_m2,
    });
    if (fingerprint) otherSourceFingerprints.add(fingerprint);
  }

  let sitemapIntersectionRows = 0;
  let nonMarrakechRows = 0;
  let missingTypeRows = 0;
  let missingIntentRows = 0;
  let tierCRows = 0;
  let exactCrossSourceCollisions = 0;
  const candidates: PromoImmoCandidate[] = [];

  for (const row of normalizedRows) {
    if (!sitemapByCanonicalUrl.has(row.canonical_url)) continue;
    sitemapIntersectionRows += 1;
    if (row.city !== "Marrakech") nonMarrakechRows += 1;
    if (!row.property_type?.trim()) missingTypeRows += 1;
    if (!row.intent?.trim()) missingIntentRows += 1;
    const display = displayByUrl.get(row.canonical_url);
    if (display?.quality_tier === "C") tierCRows += 1;
    const fingerprint = exactStructuredFingerprint({
      title: row.title,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      price: row.price_mad,
      surface: row.surface_m2,
    });
    const exactCrossSourceCollision = fingerprint !== null && otherSourceFingerprints.has(fingerprint);
    if (exactCrossSourceCollision) exactCrossSourceCollisions += 1;
    candidates.push({
      canonicalUrl: row.canonical_url,
      freshnessStatus: row.freshness_status,
      normalizationStatus: row.normalization_status,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      qualityTier: display?.quality_tier ?? null,
      qualityScore: numberOrNull(display?.quality_score ?? null),
      displayEligibility: display?.display_eligibility ?? null,
      publicSearchPresent: publicPromoUrls.has(row.canonical_url),
      technicalDisplayPresent: display !== undefined,
      exactCrossSourceCollision,
    });
  }

  const canary = selectPromoImmoCanary(candidates, PROMOIMMO_CANARY_SIZE);
  if (canary.length !== PROMOIMMO_CANARY_SIZE) throw new Error(`Expected 50 conservative canary rows, got ${canary.length}`);
  const canaryUrls = canary.map((row) => row.canonicalUrl);

  const seeds = await loadSeedStates(canaryUrls);
  if (seeds.length !== PROMOIMMO_CANARY_SIZE) throw new Error(`Expected 50 seed snapshots, got ${seeds.length}`);
  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url, row]));

  const manifest = canary.map((candidate) => {
    const seed = seedByUrl.get(candidate.canonicalUrl);
    if (!seed) throw new Error(`Missing seed snapshot: ${candidate.canonicalUrl}`);
    const before: SeedSnapshot = {
      canonicalUrl: seed.canonical_url,
      freshnessStatus: seed.freshness_status,
      freshLastSeenAt: seed.fresh_last_seen_at,
      freshChannels: seed.fresh_channels ?? [],
      metadata: seed.metadata,
      updatedAt: seed.updated_at,
    };
    const sitemapUrl = sitemapByCanonicalUrl.get(candidate.canonicalUrl);
    if (!sitemapUrl) throw new Error(`Missing current sitemap evidence: ${candidate.canonicalUrl}`);
    return buildPromoImmoCanaryPlan(before, { canonicalUrl: candidate.canonicalUrl, sitemapUrl, observedAt: generatedAt });
  });

  const listingSources = await loadListingSources(canaryUrls);
  const listingIds = [...new Set(listingSources.map((row) => String(row.property_listing_id)))];
  let propertyGraphLinkedRows = 0;
  let propertyGraphMultiMemberRows = 0;
  if (listingIds.length > 0) {
    const clusters = await restPage<PropertyClusterRow>("property_clusters", {
      select: "id,legacy_property_listing_id",
      legacy_property_listing_id: postgrestIn(listingIds),
      limit: String(listingIds.length * 2),
    });
    propertyGraphLinkedRows = clusters.length;
    const clusterIds = clusters.map((row) => row.id);
    if (clusterIds.length > 0) {
      const members = await restPage<ClusterMemberRow>("property_cluster_members", {
        select: "property_cluster_id",
        property_cluster_id: postgrestIn(clusterIds),
        limit: String(clusterIds.length * 20),
      });
      const counts = new Map<string, number>();
      for (const member of members) counts.set(member.property_cluster_id, (counts.get(member.property_cluster_id) ?? 0) + 1);
      propertyGraphMultiMemberRows = clusters.filter((cluster) => (counts.get(cluster.id) ?? 0) > 1).length;
    }
  }
  if (propertyGraphMultiMemberRows > 0) throw new Error(`Selected canary contains ${propertyGraphMultiMemberRows} known multi-member Property Graph collisions`);

  const proof = {
    schemaVersion: "data-4-4b-promoimmo-revalidation-canary-v1",
    generatedAt,
    mode: "DRY_RUN",
    sourceDomain: PROMOIMMO_DOMAIN,
    runId: PROMOIMMO_RUN_ID,
    registryReviewStatus: policy.reviewStatus,
    registryGate: "PASS",
    robotsUrl,
    declaredSitemapCount: declaredSitemaps.length,
    visitedSitemapCount: visited.size,
    currentSitemapUrlCount: sitemapByCanonicalUrl.size,
    normalizedRows: normalizedRows.length,
    sitemapIntersectionRows,
    conservativeEligibleRows: candidates.filter((row) => selectPromoImmoCanary([row], 1).length === 1).length,
    qualityAudit: {
      nonMarrakechRows,
      missingTypeRows,
      missingIntentRows,
      tierCRows,
      exactCrossSourceCollisions,
    },
    dedupAudit: {
      method: "exact_structured_cross_source_plus_existing_property_graph_links",
      propertyGraphDirectLinkCoverageRows: propertyGraphLinkedRows,
      propertyGraphKnownMultiMemberRows: propertyGraphMultiMemberRows,
      fuzzyMatchingUsed: false,
    },
    canarySize: canary.length,
    canaryFirstUrl: canary[0]?.canonicalUrl ?? null,
    canaryLastUrl: canary.at(-1)?.canonicalUrl ?? null,
    canaryPublicSearchRows: canary.filter((row) => row.publicSearchPresent).length,
    canaryTechnicalDisplayRows: canary.filter((row) => row.technicalDisplayPresent).length,
    canaryTierABRows: canary.filter((row) => ["A", "B"].includes(row.qualityTier ?? "")).length,
    seedSnapshotRows: seeds.length,
    rollbackRows: manifest.length,
    sourceRequests,
    sourceRequestBudget: MAX_SOURCE_REQUESTS,
    databaseWrites: 0,
    freshnessWrites: 0,
    registryWrites: 0,
    policyChanges: 0,
    displayPolicyChanges: 0,
    detailPageFetches: 0,
    contentReuseOperations: 0,
    canaryWriteAuthorizedByThisRun: false,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "apply-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "rollback-manifest.json"), `${JSON.stringify(manifest.map((row) => ({ canonicalUrl: row.canonicalUrl, ...row.rollback })), null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

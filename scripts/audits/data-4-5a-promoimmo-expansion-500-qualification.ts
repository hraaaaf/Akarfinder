import fs from "node:fs/promises";
import path from "node:path";
import {
  PROMOIMMO_CHANNEL,
  PROMOIMMO_DOMAIN,
  registryAllowsPromoImmoCanary,
  type PromoImmoCandidate,
  type PromoImmoRegistryPolicy,
} from "../data4/promoimmo-sitemap-canary";
import {
  qualifyPromoImmoExpansion,
  requireQualifiedPromoImmoExpansion,
  type PromoImmoExpansionCandidate,
} from "../data4/promoimmo-controlled-expansion";

const OUT_DIR = process.env.DATA_4_5A_OUT_DIR ?? ".tmp/data-4-5a/results";
const SOURCE_PROOF_PATH = process.env.DATA_4_5A_SOURCE_PROOF ?? ".tmp/data-4-5a/source-evidence/proof.json";
const SOURCE_ARTIFACT_ID = process.env.DATA_4_5A_SOURCE_ARTIFACT_ID ?? "9020834298";
const SOURCE_ARTIFACT_DIGEST = process.env.DATA_4_5A_SOURCE_ARTIFACT_DIGEST ?? "sha256:f4e4f52fb950ada9283e0d345b6e4840df3844c0ac68e25c72bfca5f4b4b1c4c";
const SOURCE_HEAD_SHA = "982571bfc9bf4c77920c50fd2850e28db092d2fc";
const SOURCE_EVIDENCE_MAX_AGE_DAYS = 14;
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type CertifiedSourceProof = {
  schemaVersion: string;
  generatedAt: string;
  mode: string;
  sourceDomain: string;
  runId: string;
  registryGate: string;
  currentSitemapUrlCount: number;
  sitemapIntersectionRows: number;
  conservativeEligibleRows: number;
  qualityAudit?: { exactCrossSourceCollisions?: number };
  sourceRequests: number;
  databaseWrites: number;
  freshnessWrites: number;
  registryWrites: number;
  detailPageFetches: number;
  canaryWriteAuthorizedByThisRun: boolean;
};
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
type SeedRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_channels: string[] | null;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.5A requires ${name}`);
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10_000);
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return null;
  return Math.min(Math.max(0, at - Date.now()), 10_000);
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError"
    || error.name === "TimeoutError"
    || /fetch failed|timed out|timeout/i.test(error.message);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return await response.json() as T[];
      const body = await response.text();
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`${table} read failed status=${response.status} attempt=${attempt}/${MAX_ATTEMPTS} path=${url.pathname}: ${body}`);
      }
      await sleep(retryAfterMs(response) ?? 500 * (2 ** (attempt - 1)));
    } catch (error) {
      if (!isRetryableFetchError(error) || attempt === MAX_ATTEMPTS) {
        throw new Error(`${table} read failed attempt=${attempt}/${MAX_ATTEMPTS} path=${url.pathname}: ${errorText(error)}`, { cause: error });
      }
      await sleep(500 * (2 ** (attempt - 1)));
    }
  }
  throw new Error(`${table} read exhausted retries path=${url.pathname}`);
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
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

function fingerprint(row: {
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

async function loadCertifiedSourceProof(now: Date): Promise<{ proof: CertifiedSourceProof; ageHours: number }> {
  const proof = JSON.parse(await fs.readFile(SOURCE_PROOF_PATH, "utf8")) as CertifiedSourceProof;
  if (proof.schemaVersion !== "data-4-4b-promoimmo-revalidation-canary-v1") throw new Error(`Unexpected DATA-4.4B proof schema: ${proof.schemaVersion}`);
  if (proof.sourceDomain !== PROMOIMMO_DOMAIN || proof.mode !== "DRY_RUN" || proof.registryGate !== "PASS") throw new Error("DATA-4.4B source proof identity/gate mismatch");
  if (proof.currentSitemapUrlCount !== 3130 || proof.sitemapIntersectionRows !== 2935 || proof.conservativeEligibleRows !== 2456) {
    throw new Error(`Unexpected DATA-4.4B certified source counts: ${JSON.stringify({ currentSitemapUrlCount: proof.currentSitemapUrlCount, sitemapIntersectionRows: proof.sitemapIntersectionRows, conservativeEligibleRows: proof.conservativeEligibleRows })}`);
  }
  if (proof.qualityAudit?.exactCrossSourceCollisions !== 0) throw new Error("DATA-4.4B source proof had exact cross-source collisions");
  if (proof.databaseWrites !== 0 || proof.freshnessWrites !== 0 || proof.registryWrites !== 0 || proof.detailPageFetches !== 0 || proof.canaryWriteAuthorizedByThisRun !== false) {
    throw new Error("DATA-4.4B source proof safety contract mismatch");
  }
  const observedAt = Date.parse(proof.generatedAt);
  if (!Number.isFinite(observedAt)) throw new Error(`Invalid DATA-4.4B generatedAt: ${proof.generatedAt}`);
  const ageMs = now.getTime() - observedAt;
  if (ageMs < 0) throw new Error("DATA-4.4B source proof is from the future");
  const maxAgeMs = SOURCE_EVIDENCE_MAX_AGE_DAYS * 86_400_000;
  if (ageMs > maxAgeMs) throw new Error(`DATA-4.4B source proof expired: ageHours=${(ageMs / 3_600_000).toFixed(2)}`);
  return { proof, ageHours: ageMs / 3_600_000 };
}

async function main(): Promise<void> {
  const now = new Date();
  const generatedAt = now.toISOString();
  const [{ proof: sourceProof, ageHours: sourceEvidenceAgeHours }, registryRows, normalizedRows, displayRows, publicRows, seedRows] = await Promise.all([
    loadCertifiedSourceProof(now),
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
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_channels",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
      order: "canonical_url.asc",
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

  const baselineRows = seedRows.filter((row) => (row.fresh_channels ?? []).includes(PROMOIMMO_CHANNEL)).length;
  if (baselineRows !== 50) throw new Error(`Certified Promo Immo sitemap baseline drift: expected 50, got ${baselineRows}`);

  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const promoPublicUrls = new Set(publicRows.filter((row) => row.source_domain === PROMOIMMO_DOMAIN).map((row) => row.canonical_url));
  const sitemapConfirmedUrls = new Set(seedRows.filter((row) => (row.fresh_channels ?? []).includes(PROMOIMMO_CHANNEL)).map((row) => row.canonical_url));

  const otherFingerprints = new Set<string>();
  for (const row of publicRows) {
    if (row.source_domain === PROMOIMMO_DOMAIN) continue;
    const key = fingerprint({
      title: row.title,
      city: row.normalized_city,
      propertyType: row.normalized_property_type,
      intent: row.normalized_intent,
      price: row.normalized_price_mad,
      surface: row.normalized_surface_m2,
    });
    if (key) otherFingerprints.add(key);
  }

  let currentExactCrossSourceCollisions = 0;
  const candidates: PromoImmoExpansionCandidate[] = normalizedRows.map((row) => {
    const display = displayByUrl.get(row.canonical_url);
    const key = fingerprint({
      title: row.title,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      price: row.price_mad,
      surface: row.surface_m2,
    });
    const exactCrossSourceCollision = key !== null && otherFingerprints.has(key);
    if (exactCrossSourceCollision) currentExactCrossSourceCollisions += 1;
    const base: PromoImmoCandidate = {
      canonicalUrl: row.canonical_url,
      freshnessStatus: row.freshness_status,
      normalizationStatus: row.normalization_status,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      qualityTier: display?.quality_tier ?? null,
      qualityScore: numberOrNull(display?.quality_score ?? null),
      displayEligibility: display?.display_eligibility ?? null,
      publicSearchPresent: promoPublicUrls.has(row.canonical_url),
      technicalDisplayPresent: display !== undefined,
      exactCrossSourceCollision,
    };
    return { ...base, alreadySitemapConfirmed: sitemapConfirmedUrls.has(row.canonical_url) };
  });

  const qualification = qualifyPromoImmoExpansion(candidates, baselineRows);
  requireQualifiedPromoImmoExpansion(qualification);
  const selected = qualification.selectedRows;
  const selectedUrls = selected.map((row) => row.canonicalUrl);
  const manifest = selected.map((row, index) => ({
    batch_number: index < 100 ? 1 : index < 200 ? 2 : index < 300 ? 3 : index < 400 ? 4 : 5,
    canonical_url: row.canonicalUrl,
    quality_score: row.qualityScore,
    current_freshness_status: row.freshnessStatus,
    source_snapshot_observed_at: sourceProof.generatedAt,
    exact_current_sitemap_membership_verified_in_this_lot: false,
    must_revalidate_current_sitemap_before_write: true,
    rollback_required_before_write: true,
  }));

  const proof = {
    schema_version: "data-4-5a-promoimmo-expansion-500-qualification-v1",
    generated_at: generatedAt,
    source_domain: PROMOIMMO_DOMAIN,
    qualification_mode: "CERTIFIED_RECENT_SOURCE_SNAPSHOT_PLUS_CURRENT_DB_CAPACITY",
    source_evidence: {
      source_head_sha: SOURCE_HEAD_SHA,
      artifact_id: SOURCE_ARTIFACT_ID,
      artifact_digest: SOURCE_ARTIFACT_DIGEST,
      observed_at: sourceProof.generatedAt,
      age_hours: Number(sourceEvidenceAgeHours.toFixed(2)),
      max_age_days: SOURCE_EVIDENCE_MAX_AGE_DAYS,
      sitemap_url_count: sourceProof.currentSitemapUrlCount,
      sitemap_intersection_rows: sourceProof.sitemapIntersectionRows,
      conservative_eligible_rows: sourceProof.conservativeEligibleRows,
      exact_cross_source_collisions: sourceProof.qualityAudit?.exactCrossSourceCollisions ?? null,
    },
    target_total_rows: qualification.targetTotal,
    certified_baseline_rows: baselineRows,
    required_new_rows: qualification.requiredNewRows,
    batch_sizes: qualification.batchSizes,
    current_seed_rows: seedRows.length,
    current_normalized_rows: normalizedRows.length,
    current_public_search_rows: promoPublicUrls.size,
    current_technical_display_rows: displayRows.length,
    current_exact_cross_source_collisions: currentExactCrossSourceCollisions,
    eligible_new_rows: qualification.eligibleNewRows,
    selected_new_rows: selected.length,
    selected_unique_rows: new Set(selectedUrls).size,
    selected_public_search_rows: selected.filter((row) => row.publicSearchPresent).length,
    selected_technical_display_rows: selected.filter((row) => row.technicalDisplayPresent).length,
    selected_exact_collision_free_rows: selected.filter((row) => !row.exactCrossSourceCollision).length,
    selected_sitemap_revalidation_required_rows: selected.length,
    source_site_requests: 0,
    source_site_detail_requests: 0,
    database_writes: 0,
    freshness_writes: 0,
    registry_mutations: 0,
    policy_changes: 0,
    display_policy_changes: 0,
    production_activation: false,
    exact_selected_sitemap_membership_certified_by_this_lot: false,
    write_authorized_by_this_lot: false,
    next_lot_must_revalidate_current_sitemap_before_each_write: true,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "qualified-450.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch(async (error) => {
  const diagnostic = {
    schema_version: "data-4-5a-failure-v1",
    generated_at: new Date().toISOString(),
    error: errorText(error),
    source_site_requests: 0,
    database_writes: 0,
    freshness_writes: 0,
    registry_mutations: 0,
  };
  try {
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, "failure.json"), `${JSON.stringify(diagnostic, null, 2)}\n`);
  } catch {
    // Preserve the primary qualification error.
  }
  console.error(error instanceof Error ? error.stack : JSON.stringify(error));
  process.exitCode = 1;
});

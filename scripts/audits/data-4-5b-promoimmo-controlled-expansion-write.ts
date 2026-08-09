import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PROMOIMMO_CHANNEL,
  PROMOIMMO_DOMAIN,
  registryAllowsPromoImmoCanary,
  type PromoImmoRegistryPolicy,
  type SeedSnapshot,
} from "../data4/promoimmo-sitemap-canary";
import {
  DATA_4_5B_TARGET_TOTAL,
  assertPostBatchCertification,
  buildExpansionWritePlan,
  expectedBatchNumber,
  expectedBatchSize,
  selectExpansionBatch,
  type CurrentSitemapEvidence,
  type ExpansionWriteCandidate,
  type ExpansionWritePlanRow,
} from "../data4/promoimmo-controlled-expansion-write";

const OUT_DIR = process.env.DATA_4_5B_OUT_DIR ?? ".tmp/data-4-5b/results";
const EVIDENCE_PATH = process.env.DATA_4_5B_CURRENT_SITEMAP_EVIDENCE ?? "";
const EVIDENCE_SHA256 = process.env.DATA_4_5B_CURRENT_SITEMAP_EVIDENCE_SHA256 ?? "";
const APPLY = process.env.DATA_4_5B_APPLY === "true";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
let databaseWrites = 0;
let rollbackWrites = 0;

type RegistryRow = {
  source_domain: string; acquisition_mode: string | null; discovery_policy: string | null;
  display_policy: string | null; display_gate: string | null; machine_gate: string | null;
  allowed_discovery_channels: string[] | null; robots_status: string | null;
  max_revalidation_interval_days: number | null; review_status: string | null;
};
type NormalizedRow = {
  canonical_url: string; freshness_status: string; normalization_status: string; city: string | null;
  property_type: string | null; intent: string | null; title: string | null;
  price_mad: number | string | null; surface_m2: number | string | null;
};
type DisplayRow = {
  canonical_url: string; quality_tier: string | null; quality_score: number | string | null; display_eligibility: string | null;
};
type PublicRow = {
  canonical_url: string; source_domain: string; title: string | null; normalized_city: string | null;
  normalized_property_type: string | null; normalized_intent: string | null;
  normalized_price_mad: number | string | null; normalized_surface_m2: number | string | null;
};
type SeedRow = {
  canonical_url: string; freshness_status: string; fresh_last_seen_at: string | null;
  fresh_channels: string[] | null; metadata: Record<string, unknown> | null; updated_at: string | null;
};

type Certification = {
  expectedRows: number; publicSearchRows: number; technicalDisplayRows: number;
  qualityTierABRows: number; projectionRows: number; exactCollisionRows: number; freshProjectionRows: number;
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.5B requires ${name}`);
  return value;
}
function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try { return JSON.stringify(error); } catch { return String(error); }
}
async function request(url: URL, init: RequestInit): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.ok || !RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) return response;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
    }
    await sleep(500 * 2 ** (attempt - 1));
  }
  throw new Error(`DATA-4.5B exhausted retries: ${url.pathname}`);
}
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}`, ...extra };
}
async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await request(url, { headers: authHeaders() });
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
async function patchSeed(
  canonicalUrl: string,
  payload: Record<string, unknown>,
  expectedFreshnessStatus: "seed_only" | "fresh_confirmed",
): Promise<void> {
  const url = new URL("/rest/v1/source_offer_seeds", env("SUPABASE_URL"));
  url.searchParams.set("canonical_url", `eq.${canonicalUrl}`);
  url.searchParams.set("source_domain", `eq.${PROMOIMMO_DOMAIN}`);
  url.searchParams.set("freshness_status", `eq.${expectedFreshnessStatus}`);
  const response = await request(url, {
    method: "PATCH",
    headers: authHeaders({ "content-type": "application/json", prefer: "return=representation" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`source_offer_seeds write failed ${response.status}: ${await response.text()}`);
  const changed = await response.json() as unknown[];
  if (changed.length !== 1) throw new Error(`DATA-4.5B compare-and-set rejected state drift: ${canonicalUrl}`);
}
function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function normalizedTitle(value: string | null): string | null {
  const normalized = value?.toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
  return normalized || null;
}
function fingerprint(row: {
  title: string | null; city: string | null; propertyType: string | null; intent: string | null;
  price: number | string | null; surface: number | string | null;
}): string | null {
  const title = normalizedTitle(row.title);
  const price = numberOrNull(row.price);
  const surface = numberOrNull(row.surface);
  if (!title || !row.city || !row.propertyType || !row.intent || price === null || surface === null) return null;
  return JSON.stringify([title, row.city, row.propertyType, row.intent, price, surface]);
}
function requireApplyAcknowledgements(batchNumber: number): void {
  const expected = `BATCH_${batchNumber}_YES`;
  if (process.env.DATA_4_5B_CONFIRM_CURRENT_SITEMAP !== expected) throw new Error("DATA-4.5B current sitemap acknowledgement missing");
  if (process.env.DATA_4_5B_CONFIRM_ROLLBACK_READY !== expected) throw new Error("DATA-4.5B rollback acknowledgement missing");
  if (process.env.DATA_4_5B_CONFIRM_BOUNDED_WRITE !== expected) throw new Error("DATA-4.5B bounded write acknowledgement missing");
}
async function writeManifests(plan: ExpansionWritePlanRow[], evidenceDigest: string): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "apply-manifest.json"), `${JSON.stringify({ evidenceSha256: evidenceDigest, rows: plan }, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "rollback-manifest.json"), `${JSON.stringify({
    evidenceSha256: evidenceDigest,
    rows: plan.map((row) => ({ canonicalUrl: row.canonicalUrl, batchNumber: row.batchNumber, rollback: row.rollback })),
  }, null, 2)}\n`);
}
async function rollback(applied: ExpansionWritePlanRow[]): Promise<void> {
  for (const row of [...applied].reverse()) {
    await patchSeed(row.canonicalUrl, {
      freshness_status: row.rollback.freshnessStatus,
      fresh_last_seen_at: row.rollback.freshLastSeenAt,
      fresh_channels: row.rollback.freshChannels,
      metadata: row.rollback.metadata,
    }, "fresh_confirmed");
    rollbackWrites += 1;
  }
}
async function verifyRollback(applied: ExpansionWritePlanRow[]): Promise<void> {
  const rows = await restAll<SeedRow>("source_offer_seeds", {
    select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
    source_domain: `eq.${PROMOIMMO_DOMAIN}`,
  });
  const byUrl = new Map(rows.map((row) => [row.canonical_url, row]));
  for (const plan of applied) {
    const row = byUrl.get(plan.canonicalUrl);
    if (!row) throw new Error(`DATA-4.5B rollback verification missing row: ${plan.canonicalUrl}`);
    if (row.freshness_status !== plan.rollback.freshnessStatus) throw new Error(`DATA-4.5B rollback freshness mismatch: ${plan.canonicalUrl}`);
    if (row.fresh_last_seen_at !== plan.rollback.freshLastSeenAt) throw new Error(`DATA-4.5B rollback timestamp mismatch: ${plan.canonicalUrl}`);
    if (JSON.stringify(row.fresh_channels ?? []) !== JSON.stringify(plan.rollback.freshChannels)) throw new Error(`DATA-4.5B rollback channels mismatch: ${plan.canonicalUrl}`);
    if (JSON.stringify(row.metadata) !== JSON.stringify(plan.rollback.metadata)) throw new Error(`DATA-4.5B rollback metadata mismatch: ${plan.canonicalUrl}`);
  }
}
async function certifySelected(urls: Set<string>, expectedRows: number, requireFresh: boolean): Promise<Certification> {
  const [normalized, display, publicRows] = await Promise.all([
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,freshness_status,normalization_status,city,property_type,intent,title,price_mad,surface_m2",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,quality_tier,quality_score,display_eligibility",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url,source_domain,title,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2",
    }),
  ]);
  const selectedNormalized = normalized.filter((row) => urls.has(row.canonical_url));
  const selectedDisplay = display.filter((row) => urls.has(row.canonical_url));
  const selectedPublic = publicRows.filter((row) => row.source_domain === PROMOIMMO_DOMAIN && urls.has(row.canonical_url));
  const otherFingerprints = new Set(publicRows.filter((row) => row.source_domain !== PROMOIMMO_DOMAIN).map((row) => fingerprint({
    title: row.title, city: row.normalized_city, propertyType: row.normalized_property_type, intent: row.normalized_intent,
    price: row.normalized_price_mad, surface: row.normalized_surface_m2,
  })).filter((value): value is string => value !== null));
  let collisionRows = 0;
  for (const row of selectedNormalized) {
    const key = fingerprint({ title: row.title, city: row.city, propertyType: row.property_type, intent: row.intent, price: row.price_mad, surface: row.surface_m2 });
    if (key && otherFingerprints.has(key)) collisionRows += 1;
  }
  const result: Certification = {
    expectedRows,
    publicSearchRows: selectedPublic.length,
    technicalDisplayRows: selectedDisplay.length,
    qualityTierABRows: selectedDisplay.filter((row) => ["A", "B"].includes(row.quality_tier ?? "")).length,
    projectionRows: selectedNormalized.filter((row) => row.normalization_status === "normalized").length,
    exactCollisionRows: collisionRows,
    freshProjectionRows: selectedNormalized.filter((row) => row.freshness_status === "fresh_confirmed").length,
  };
  assertPostBatchCertification(result);
  if (requireFresh && result.freshProjectionRows !== expectedRows) throw new Error(`DATA-4.5B freshness projection drift: ${result.freshProjectionRows}/${expectedRows}`);
  return result;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, normalizedRows, displayRows, publicRows, seedRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,robots_status,max_revalidation_interval_days,review_status",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,freshness_status,normalization_status,city,property_type,intent,title,price_mad,surface_m2",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,quality_tier,quality_score,display_eligibility",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
    restAll<PublicRow>("public_search_representations_v1", {
      select: "canonical_url,source_domain,title,normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2",
    }),
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    }),
  ]);
  if (registryRows.length !== 1) throw new Error(`DATA-4.5B expected one Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;
  const policy: PromoImmoRegistryPolicy = {
    sourceDomain: registry.source_domain, acquisitionMode: registry.acquisition_mode, discoveryPolicy: registry.discovery_policy,
    displayPolicy: registry.display_policy, displayGate: registry.display_gate, machineGate: registry.machine_gate,
    allowedDiscoveryChannels: registry.allowed_discovery_channels ?? [], robotsStatus: registry.robots_status,
    maxRevalidationIntervalDays: registry.max_revalidation_interval_days, reviewStatus: registry.review_status,
  };
  if (!registryAllowsPromoImmoCanary(policy)) throw new Error(`DATA-4.5B Registry gate failed: ${JSON.stringify(policy)}`);
  const persistentRows = seedRows.filter((row) => (row.fresh_channels ?? []).includes(PROMOIMMO_CHANNEL)).length;
  const batchNumber = expectedBatchNumber(persistentRows);
  const nextBatchSize = expectedBatchSize(persistentRows);
  if (persistentRows > DATA_4_5B_TARGET_TOTAL) throw new Error(`DATA-4.5B target exceeded: ${persistentRows}`);

  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const promoPublic = new Set(publicRows.filter((row) => row.source_domain === PROMOIMMO_DOMAIN).map((row) => row.canonical_url));
  const otherFingerprints = new Set(publicRows.filter((row) => row.source_domain !== PROMOIMMO_DOMAIN).map((row) => fingerprint({
    title: row.title, city: row.normalized_city, propertyType: row.normalized_property_type, intent: row.normalized_intent,
    price: row.normalized_price_mad, surface: row.normalized_surface_m2,
  })).filter((value): value is string => value !== null));
  const seedByUrl = new Map(seedRows.map((row) => [row.canonical_url, row]));
  const candidates: ExpansionWriteCandidate[] = normalizedRows
    .filter((row) => row.freshness_status === "seed_only" && row.normalization_status === "normalized" && row.city === "Marrakech" && Boolean(row.property_type?.trim()) && Boolean(row.intent?.trim()))
    .filter((row) => !(seedByUrl.get(row.canonical_url)?.fresh_channels ?? []).includes(PROMOIMMO_CHANNEL))
    .map((row) => {
      const display = displayByUrl.get(row.canonical_url);
      const key = fingerprint({ title: row.title, city: row.city, propertyType: row.property_type, intent: row.intent, price: row.price_mad, surface: row.surface_m2 });
      return {
        canonicalUrl: row.canonical_url,
        qualityScore: numberOrNull(display?.quality_score ?? null) ?? 0,
        publicSearchPresent: promoPublic.has(row.canonical_url), technicalDisplayPresent: display !== undefined,
        qualityTier: display?.quality_tier ?? null, displayEligibility: display?.display_eligibility ?? null,
        exactCrossSourceCollision: key !== null && otherFingerprints.has(key),
      };
    });
  const conservativeCurrentDbCandidates = candidates.filter((row) => row.publicSearchPresent && row.technicalDisplayPresent && ["A", "B"].includes(row.qualityTier ?? "") && row.displayEligibility?.startsWith("eligible_") === true && !row.exactCrossSourceCollision).length;
  await fs.mkdir(OUT_DIR, { recursive: true });

  if (!EVIDENCE_PATH) {
    if (APPLY) throw new Error("DATA-4.5B APPLY forbidden without current sitemap evidence");
    const proof = {
      schemaVersion: "data-4-5b-promoimmo-controlled-expansion-write-v1", mode: "EVIDENCE_REQUIRED", generatedAt,
      sourceDomain: PROMOIMMO_DOMAIN, currentPersistentRows: persistentRows, nextBatchNumber: batchNumber, nextBatchSize,
      conservativeCurrentDbCandidates, currentSitemapEvidencePresent: false,
      sourceSiteRequests: 0, sourceSiteDetailRequests: 0, databaseWrites: 0, rollbackWrites: 0,
      registryMutations: 0, policyChanges: 0, productionActivation: false, applyAuthorized: false,
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  const evidenceText = await fs.readFile(EVIDENCE_PATH, "utf8");
  const evidenceDigest = crypto.createHash("sha256").update(evidenceText).digest("hex");
  if (!EVIDENCE_SHA256 || EVIDENCE_SHA256 !== evidenceDigest) throw new Error("DATA-4.5B current sitemap evidence digest missing or mismatched");
  const evidence = JSON.parse(evidenceText) as CurrentSitemapEvidence;
  if (batchNumber === null) {
    const proof = {
      schemaVersion: "data-4-5b-promoimmo-controlled-expansion-write-v1", mode: "FINAL_RECERTIFICATION", generatedAt,
      sourceDomain: PROMOIMMO_DOMAIN, currentPersistentRows: persistentRows, targetRows: DATA_4_5B_TARGET_TOTAL,
      evidenceSha256: evidenceDigest, sourceSiteRequests: 0, sourceSiteDetailRequests: 0, databaseWrites: 0, rollbackWrites: 0,
      registryMutations: 0, policyChanges: 0, productionActivation: false, furtherWriteAuthorized: false,
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  const selected = selectExpansionBatch(candidates, evidence, persistentRows);
  const snapshots = new Map<string, SeedSnapshot>();
  for (const candidate of selected) {
    const seed = seedByUrl.get(candidate.canonicalUrl);
    if (!seed) throw new Error(`DATA-4.5B missing seed row: ${candidate.canonicalUrl}`);
    snapshots.set(candidate.canonicalUrl, {
      canonicalUrl: seed.canonical_url, freshnessStatus: seed.freshness_status, freshLastSeenAt: seed.fresh_last_seen_at,
      freshChannels: seed.fresh_channels ?? [], metadata: seed.metadata, updatedAt: seed.updated_at,
    });
  }
  const plan = buildExpansionWritePlan(selected, snapshots, evidence, persistentRows);
  await writeManifests(plan, evidenceDigest);
  const selectedUrls = new Set(plan.map((row) => row.canonicalUrl));
  const preCertification = await certifySelected(selectedUrls, plan.length, false);

  if (!APPLY) {
    const proof = {
      schemaVersion: "data-4-5b-promoimmo-controlled-expansion-write-v1", mode: "DRY_RUN_CURRENT_EVIDENCE", generatedAt,
      sourceDomain: PROMOIMMO_DOMAIN, currentPersistentRows: persistentRows, nextBatchNumber: batchNumber, nextBatchSize: plan.length,
      evidenceObservedAt: evidence.observedAt, evidenceRows: evidence.rows.length, evidenceSha256: evidenceDigest,
      rollbackRows: plan.length, preCertification, sourceSiteRequests: 0, sourceSiteDetailRequests: 0,
      databaseWrites: 0, rollbackWrites: 0, registryMutations: 0, policyChanges: 0, productionActivation: false, applyAuthorized: false,
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  requireApplyAcknowledgements(batchNumber);
  const applied: ExpansionWritePlanRow[] = [];
  try {
    for (const row of plan) {
      await patchSeed(row.canonicalUrl, {
        freshness_status: row.proposed.freshnessStatus,
        fresh_last_seen_at: row.proposed.freshLastSeenAt,
        fresh_channels: row.proposed.freshChannels,
        metadata: row.proposed.metadata,
      }, "seed_only");
      databaseWrites += 1;
      applied.push(row);
    }
    await sleep(1500);
    const postCertification = await certifySelected(selectedUrls, plan.length, true);
    const afterSeeds = await restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
      source_domain: `eq.${PROMOIMMO_DOMAIN}`,
    });
    const afterPersistentRows = afterSeeds.filter((row) => (row.fresh_channels ?? []).includes(PROMOIMMO_CHANNEL)).length;
    if (afterPersistentRows !== persistentRows + plan.length) throw new Error(`DATA-4.5B persistent count drift: expected ${persistentRows + plan.length}, got ${afterPersistentRows}`);
    const proof = {
      schemaVersion: "data-4-5b-promoimmo-controlled-expansion-write-v1", mode: "APPLIED_AND_CERTIFIED", generatedAt,
      sourceDomain: PROMOIMMO_DOMAIN, batchNumber, batchSize: plan.length, beforePersistentRows: persistentRows, afterPersistentRows,
      evidenceObservedAt: evidence.observedAt, evidenceRows: evidence.rows.length, evidenceSha256: evidenceDigest,
      rollbackRows: plan.length, preCertification, postCertification,
      sourceSiteRequests: 0, sourceSiteDetailRequests: 0, databaseWrites, rollbackWrites,
      registryMutations: 0, policyChanges: 0, productionActivation: true, targetRows: DATA_4_5B_TARGET_TOTAL,
      nextBatchNumber: expectedBatchNumber(afterPersistentRows), nextBatchSize: expectedBatchSize(afterPersistentRows),
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } catch (error) {
    try {
      await rollback(applied);
      await verifyRollback(applied);
    } catch (rollbackError) {
      throw new Error(`DATA-4.5B apply failed and rollback verification failed. apply=${errorText(error)} rollback=${errorText(rollbackError)}`);
    }
    throw new Error(`DATA-4.5B apply failed; ${rollbackWrites}/${applied.length} applied rows rolled back and verified. cause=${errorText(error)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

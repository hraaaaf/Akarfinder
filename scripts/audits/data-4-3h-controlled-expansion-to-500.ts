import fs from "node:fs/promises";
import path from "node:path";
import { extractRobotsSitemaps, parseSitemapXml, sameDarAgadirOrigin } from "../data4/daragadir-sitemap-revalidation";
import { classifyFreshnessShadowRows, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../data4/daragadir-freshness-shadow";
import { PROMOTION_CHANNEL, PROMOTION_TTL_DAYS, selectPromotionBatch, type PromotionSnapshot } from "../data4/daragadir-controlled-promotion";
import { buildExpansionPlan, requireCertifiedExpansionCheckpoint } from "../data4/daragadir-controlled-expansion";
import { expansionBatchRunId, buildExpansionPersistentBatchPlan } from "../data4/daragadir-expansion-persistent-batch";

const outDir = process.env.DATA_4_3H_OUT_DIR ?? ".tmp/data-4-3h/results";
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK_SIZE = 20;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
const CERTIFIED_START_RUN_ID = "data-4-3g-daragadir-v1";
const EXPECTED_EXPANSION_BATCH_SIZES = [100,100,100,100,50] as const;
let sourceRequests = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3H requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
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

function postgrestIn(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}

async function loadUrlPresence(table: string, urls: string[]): Promise<Set<string>> {
  const present = new Set<string>();
  for (let i = 0; i < urls.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + LOOKUP_CHUNK_SIZE);
    const rows = await restPage<{ canonical_url: string }>(table, { select: "canonical_url", canonical_url: postgrestIn(chunk), limit: String(chunk.length) });
    for (const row of rows) present.add(row.canonical_url);
  }
  return present;
}

async function fetchAllowedText(urlString: string): Promise<string> {
  if (!sameDarAgadirOrigin(urlString)) throw new Error(`Disallowed URL ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("Request budget exceeded");
  const response = await fetch(urlString, { redirect: "follow", headers: { "user-agent": "AkarFinder/1.0 (+controlled-expansion-dry-run; sitemap-only; no-detail-fetch)" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok || !sameDarAgadirOrigin(response.url)) throw new Error(`Source read failed ${response.status}: ${urlString}`);
  return response.text();
}

type RegistryRow = { source_domain:string; acquisition_mode:string; discovery_policy:string; display_policy:string; display_gate:string; machine_gate:string; allowed_discovery_channels:string[]|null; max_revalidation_interval_days:number|null; review_status:string|null };
type NormalizedRow = { canonical_url:string; normalization_status:string; freshness_status:string; city:string|null; property_type:string|null; intent:string|null };
type DisplayRow = { canonical_url:string; display_eligibility:string; quality_score:number|string|null };
type SeedDbRow = { canonical_url:string; freshness_status:string; fresh_last_seen_at:string|null; fresh_channels:string[]|null; metadata:Record<string,unknown>|null; updated_at:string|null };

type Progress = {
  certifiedStartRows:number;
  controlledExpansionRows:number;
  currentPersistentRows:number;
  completedBatchNumbers:number[];
  nextBatchNumber:number;
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function rowControlIdentity(row: SeedDbRow): "baseline" | number | null {
  const evidence = objectValue(row.metadata?.freshness_evidence);
  const persistent = objectValue(evidence?.persistent_batch);
  if (persistent?.run_id === CERTIFIED_START_RUN_ID) return "baseline";
  const marker = objectValue(evidence?.controlled_expansion_batch);
  if (!marker) return null;
  const batchNumber = Number(marker.batch_number);
  if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > EXPECTED_EXPANSION_BATCH_SIZES.length) return null;
  if (marker.run_id !== expansionBatchRunId(batchNumber)) return null;
  return batchNumber;
}

function certifyPersistedProgress(rows: SeedDbRow[]): Progress {
  let certifiedStartRows = 0;
  const batchCounts = new Map<number, number>();
  let controlledExpansionRows = 0;

  for (const row of rows) {
    if (row.freshness_status !== "fresh_confirmed" || !(row.fresh_channels ?? []).includes(PROMOTION_CHANNEL)) continue;
    const identity = rowControlIdentity(row);
    if (identity === "baseline") {
      certifiedStartRows += 1;
      continue;
    }
    if (identity === null) continue;
    controlledExpansionRows += 1;
    batchCounts.set(identity, (batchCounts.get(identity) ?? 0) + 1);
  }

  if (certifiedStartRows !== 50) throw new Error(`Expected certified DATA-4.3G baseline 50, got ${certifiedStartRows}`);

  const completedBatchNumbers:number[] = [];
  let gapSeen = false;
  for (let index = 0; index < EXPECTED_EXPANSION_BATCH_SIZES.length; index += 1) {
    const batchNumber = index + 1;
    const count = batchCounts.get(batchNumber) ?? 0;
    const expected = EXPECTED_EXPANSION_BATCH_SIZES[index]!;
    if (count === 0) {
      gapSeen = true;
      continue;
    }
    if (gapSeen) throw new Error(`Non-sequential persisted DATA-4.3H batch ${batchNumber}`);
    if (count !== expected) throw new Error(`Partial persisted DATA-4.3H batch ${batchNumber}: expected ${expected}, got ${count}`);
    completedBatchNumbers.push(batchNumber);
  }

  const expectedControlledRows = completedBatchNumbers.reduce((sum, batchNumber) => sum + EXPECTED_EXPANSION_BATCH_SIZES[batchNumber - 1]!, 0);
  if (controlledExpansionRows !== expectedControlledRows) {
    throw new Error(`Unexpected controlled expansion rows: expected ${expectedControlledRows}, got ${controlledExpansionRows}`);
  }

  return {
    certifiedStartRows,
    controlledExpansionRows,
    currentPersistentRows:certifiedStartRows + controlledExpansionRows,
    completedBatchNumbers,
    nextBatchNumber:completedBatchNumbers.length + 1,
  };
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function loadSeedStates(urls: string[]): Promise<SeedDbRow[]> {
  const rows: SeedDbRow[] = [];
  for (let i = 0; i < urls.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + LOOKUP_CHUNK_SIZE);
    rows.push(...await restPage<SeedDbRow>("source_offer_seeds", {
      select:"canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at",
      canonical_url:postgrestIn(chunk),
      limit:String(chunk.length),
    }));
  }
  return rows;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const [registryRows, normalized, display, sitemapPersistentRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", { select:"source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status", source_domain:"eq.daragadir.com" }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", { select:"canonical_url,normalization_status,freshness_status,city,property_type,intent", source_domain:"eq.daragadir.com", order:"canonical_url.asc" }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", { select:"canonical_url,display_eligibility,quality_score", source_domain:"eq.daragadir.com", order:"canonical_url.asc" }),
    restAll<SeedDbRow>("source_offer_seeds", { select:"canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at", source_domain:"eq.daragadir.com", fresh_channels:"cs.{public_sitemap_presence}", order:"canonical_url.asc" }),
  ]);
  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);
  const progress = certifyPersistedProgress(sitemapPersistentRows);
  const registry = registryRows[0]!;
  const policy: FreshnessShadowPolicy = {
    sourceDomain: registry.source_domain,
    acquisitionMode: registry.acquisition_mode,
    discoveryPolicy: registry.discovery_policy,
    displayPolicy: registry.display_policy,
    displayGate: registry.display_gate,
    machineGate: registry.machine_gate,
    allowedDiscoveryChannels: registry.allowed_discovery_channels ?? [],
    maxRevalidationIntervalDays: registry.max_revalidation_interval_days,
    reviewStatus: registry.review_status,
  };
  if (!policyAllowsFreshnessShadow(policy) || policy.maxRevalidationIntervalDays !== PROMOTION_TTL_DAYS) throw new Error(`Registry boundary mismatch: ${JSON.stringify(policy)}`);

  const robots = await fetchAllowedText("https://daragadir.com/robots.txt");
  const queue = [...extractRobotsSitemaps(robots)];
  if (!queue.length) throw new Error("No sitemap declared");
  const visited = new Set<string>();
  const sitemapByCanonicalUrl = new Map<string,string>();
  while (queue.length) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`Unknown sitemap ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) sitemapByCanonicalUrl.set(canonicalUrl, sitemapUrl);
    }
  }

  const displayByUrl = new Map(display.map((row) => [row.canonical_url, row]));
  const plan = buildExpansionPlan(progress.currentPersistentRows, 0);
  requireCertifiedExpansionCheckpoint(plan);

  if (progress.currentPersistentRows === 500) {
    if (progress.controlledExpansionRows !== 450 || progress.completedBatchNumbers.join(",") !== "1,2,3,4,5") {
      throw new Error(`Invalid final controlled progress: ${JSON.stringify(progress)}`);
    }
    const controlledRows = sitemapPersistentRows.filter((row) => rowControlIdentity(row) !== null);
    const controlledUrls = controlledRows.map((row) => row.canonical_url);
    if (controlledUrls.length !== 500 || new Set(controlledUrls).size !== 500) throw new Error(`Expected 500 unique controlled URLs, got ${controlledUrls.length}`);
    const currentSitemapRows = controlledUrls.filter((url) => sitemapByCanonicalUrl.has(url)).length;
    if (currentSitemapRows !== 500) throw new Error(`Final sitemap re-certification drift: expected 500, got ${currentSitemapRows}`);
    const publicPresence = await loadUrlPresence("public_search_representations_v1", controlledUrls);
    const technicalDisplayRows = controlledUrls.filter((url) => displayByUrl.has(url)).length;
    if (publicPresence.size !== 500) throw new Error(`Final Public Search drift: expected 500, got ${publicPresence.size}`);
    if (technicalDisplayRows !== 500) throw new Error(`Final technical display drift: expected 500, got ${technicalDisplayRows}`);

    const proof = {
      schemaVersion:"data-4-3h-final-recertification-v1",
      generatedAt,
      mode:"FINAL_RECERTIFICATION",
      certifiedStartRunId:CERTIFIED_START_RUN_ID,
      certifiedStartRows:progress.certifiedStartRows,
      completedBatchNumbers:progress.completedBatchNumbers,
      controlledExpansionRows:progress.controlledExpansionRows,
      currentPersistentRows:progress.currentPersistentRows,
      globalSitemapPersistentRows:sitemapPersistentRows.length,
      controlledRows:controlledUrls.length,
      controlledCurrentSitemapRows:currentSitemapRows,
      controlledPublicSearchRows:publicPresence.size,
      controlledTechnicalDisplayRows:technicalDisplayRows,
      currentSitemapUrlCount:sitemapByCanonicalUrl.size,
      expansionPlan:plan,
      sourceRequests,
      sourceRequestBudget:MAX_SOURCE_REQUESTS,
      registryReviewStatus:policy.reviewStatus,
      ttlDays:PROMOTION_TTL_DAYS,
      databaseWrites:0,
      freshnessWrites:0,
      policyChanges:0,
      displayPolicyChanges:0,
      productionActivation:false,
      detailPageFetches:0,
      contentReuseOperations:0,
      furtherPromotionAuthorized:false,
    };
    await fs.mkdir(outDir, { recursive:true });
    await fs.writeFile(path.join(outDir,"proof.json"), `${JSON.stringify(proof,null,2)}\n`);
    await fs.writeFile(path.join(outDir,"apply-manifest.json"), "[]\n");
    await fs.writeFile(path.join(outDir,"rollback-manifest.json"), "[]\n");
    console.log(JSON.stringify(proof,null,2));
    return;
  }

  const candidates: FreshnessShadowCandidate[] = normalized.map((row) => {
    const d = displayByUrl.get(row.canonical_url);
    return { canonicalUrl:row.canonical_url, normalizationStatus:row.normalization_status, freshnessStatus:row.freshness_status, city:row.city, propertyType:row.property_type, intent:row.intent, qualityScore:d ? numberOrNull(d.quality_score) : null, displayEligibility:d?.display_eligibility ?? null };
  });
  const shadow = classifyFreshnessShadowRows(candidates, policy, new Set(sitemapByCanonicalUrl.keys()));
  const eligibleSeedOnly = shadow.filter((row) => row.classification === "SHADOW_READY" && row.freshnessStatus === "seed_only");
  const expansionPlan = buildExpansionPlan(progress.currentPersistentRows, eligibleSeedOnly.length);
  requireCertifiedExpansionCheckpoint(expansionPlan);
  const nextBatch = selectPromotionBatch(eligibleSeedOnly, expansionPlan.nextBatchSize);
  if (nextBatch.length !== expansionPlan.nextBatchSize) throw new Error(`Expected next batch ${expansionPlan.nextBatchSize}, got ${nextBatch.length}`);
  const urls = nextBatch.map((row) => row.canonicalUrl);
  const [publicPresence, seeds] = await Promise.all([
    loadUrlPresence("public_search_representations_v1", urls),
    loadSeedStates(urls),
  ]);
  if (seeds.length !== expansionPlan.nextBatchSize) throw new Error(`Expected ${expansionPlan.nextBatchSize} seed states, got ${seeds.length}`);
  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url,row]));
  const manifest = nextBatch.map((candidate) => {
    const seed = seedByUrl.get(candidate.canonicalUrl);
    if (!seed) throw new Error(`Missing seed state for ${candidate.canonicalUrl}`);
    const sitemapUrl = sitemapByCanonicalUrl.get(candidate.canonicalUrl);
    if (!sitemapUrl) throw new Error(`Missing sitemap evidence for ${candidate.canonicalUrl}`);
    const before: PromotionSnapshot = {
      canonicalUrl:seed.canonical_url,
      freshnessStatus:seed.freshness_status,
      freshLastSeenAt:seed.fresh_last_seen_at,
      freshChannels:seed.fresh_channels ?? [],
      metadata:seed.metadata,
      updatedAt:seed.updated_at,
    };
    return buildExpansionPersistentBatchPlan(before, { canonicalUrl:candidate.canonicalUrl, observedAt:generatedAt, sitemapUrl }, progress.nextBatchNumber);
  });

  const runId = expansionBatchRunId(progress.nextBatchNumber);
  const proof = {
    schemaVersion:"data-4-3h-controlled-expansion-v2",
    generatedAt,
    mode:"DRY_RUN",
    certifiedStartRunId:CERTIFIED_START_RUN_ID,
    certifiedStartRows:progress.certifiedStartRows,
    completedBatchNumbers:progress.completedBatchNumbers,
    controlledExpansionRows:progress.controlledExpansionRows,
    nextBatchNumber:progress.nextBatchNumber,
    runId,
    currentPersistentRows:progress.currentPersistentRows,
    globalSitemapPersistentRows:sitemapPersistentRows.length,
    currentSitemapUrlCount:sitemapByCanonicalUrl.size,
    eligibleSeedOnlyRows:eligibleSeedOnly.length,
    expansionPlan,
    nextBatchSize:nextBatch.length,
    nextBatchFirstUrl:nextBatch[0]?.canonicalUrl ?? null,
    nextBatchLastUrl:nextBatch.at(-1)?.canonicalUrl ?? null,
    beforePublicSearchRows:publicPresence.size,
    beforeTechnicalDisplayRows:nextBatch.filter((row) => displayByUrl.has(row.canonicalUrl)).length,
    seedStateReads:seeds.length,
    rollbackRows:manifest.length,
    sourceRequests,
    sourceRequestBudget:MAX_SOURCE_REQUESTS,
    registryReviewStatus:policy.reviewStatus,
    ttlDays:PROMOTION_TTL_DAYS,
    databaseWrites:0,
    freshnessWrites:0,
    policyChanges:0,
    displayPolicyChanges:0,
    productionActivation:false,
    detailPageFetches:0,
    contentReuseOperations:0,
  };
  await fs.mkdir(outDir, { recursive:true });
  await fs.writeFile(path.join(outDir,"proof.json"), `${JSON.stringify(proof,null,2)}\n`);
  await fs.writeFile(path.join(outDir,"apply-manifest.json"), `${JSON.stringify(manifest,null,2)}\n`);
  await fs.writeFile(path.join(outDir,"rollback-manifest.json"), `${JSON.stringify(manifest.map((row) => ({ canonicalUrl:row.canonicalUrl, ...row.rollback })),null,2)}\n`);
  console.log(JSON.stringify(proof,null,2));
}

main().catch((error:unknown) => { console.error(error); process.exitCode=1; });

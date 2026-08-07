import fs from "node:fs/promises";
import path from "node:path";
import { extractRobotsSitemaps, parseSitemapXml, sameDarAgadirOrigin } from "../data4/daragadir-sitemap-revalidation";
import { classifyFreshnessShadowRows, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../data4/daragadir-freshness-shadow";
import { PROMOTION_CHANNEL, PROMOTION_TTL_DAYS, selectPromotionBatch } from "../data4/daragadir-controlled-promotion";
import { buildExpansionPlan, requireCertifiedExpansionStart } from "../data4/daragadir-controlled-expansion";

const outDir = process.env.DATA_4_3H_OUT_DIR ?? ".tmp/data-4-3h/results";
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK_SIZE = 20;
const TIMEOUT_MS = 15000;
const MAX_SOURCE_REQUESTS = 40;
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

async function exactCount(table: string, params: Record<string, string>): Promise<number> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("select", "canonical_url");
  url.searchParams.set("limit", "1");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok && response.status !== 206) throw new Error(`${table} count failed: ${response.status} ${await response.text()}`);
  const total = response.headers.get("content-range")?.split("/")[1];
  if (!total || total === "*") throw new Error(`Missing exact count for ${table}`);
  return Number(total);
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

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function main(): Promise<void> {
  const [registryRows, normalized, display, currentPersistentRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", { select:"source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status", source_domain:"eq.daragadir.com" }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", { select:"canonical_url,normalization_status,freshness_status,city,property_type,intent", source_domain:"eq.daragadir.com", order:"canonical_url.asc" }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", { select:"canonical_url,display_eligibility,quality_score", source_domain:"eq.daragadir.com", order:"canonical_url.asc" }),
    exactCount("source_offer_seeds", { source_domain:"eq.daragadir.com", fresh_channels:"cs.{public_sitemap_presence}" }),
  ]);
  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);
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
  const sitemapUrls = new Set<string>();
  while (queue.length) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchAllowedText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`Unknown sitemap ${sitemapUrl}`);
    if (parsed.kind === "index") for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    else for (const url of parsed.locs) sitemapUrls.add(url);
  }

  const displayByUrl = new Map(display.map((row) => [row.canonical_url, row]));
  const candidates: FreshnessShadowCandidate[] = normalized.map((row) => {
    const d = displayByUrl.get(row.canonical_url);
    return { canonicalUrl:row.canonical_url, normalizationStatus:row.normalization_status, freshnessStatus:row.freshness_status, city:row.city, propertyType:row.property_type, intent:row.intent, qualityScore:d ? numberOrNull(d.quality_score) : null, displayEligibility:d?.display_eligibility ?? null };
  });
  const shadow = classifyFreshnessShadowRows(candidates, policy, sitemapUrls);
  const eligibleSeedOnly = shadow.filter((row) => row.classification === "SHADOW_READY" && row.freshnessStatus === "seed_only");
  const plan = buildExpansionPlan(currentPersistentRows, eligibleSeedOnly.length);
  requireCertifiedExpansionStart(plan);
  const nextBatch = selectPromotionBatch(eligibleSeedOnly, plan.nextBatchSize);
  if (nextBatch.length !== 100) throw new Error(`Expected next batch 100, got ${nextBatch.length}`);
  const urls = nextBatch.map((row) => row.canonicalUrl);
  const publicPresence = await loadUrlPresence("public_search_representations_v1", urls);

  const proof = {
    schemaVersion:"data-4-3h-controlled-expansion-v1",
    generatedAt:new Date().toISOString(),
    mode:"DRY_RUN",
    currentPersistentRows,
    eligibleSeedOnlyRows:eligibleSeedOnly.length,
    expansionPlan:plan,
    nextBatchSize:nextBatch.length,
    nextBatchFirstUrl:nextBatch[0]?.canonicalUrl ?? null,
    nextBatchLastUrl:nextBatch.at(-1)?.canonicalUrl ?? null,
    beforePublicSearchRows:publicPresence.size,
    beforeTechnicalDisplayRows:nextBatch.filter((row) => displayByUrl.has(row.canonicalUrl)).length,
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
  console.log(JSON.stringify(proof,null,2));
}

main().catch((error:unknown) => { console.error(error); process.exitCode=1; });

import fs from "node:fs/promises";
import path from "node:path";
import {
  INITIAL_PERSISTENT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION,
  MAX_DRIFT_RATIO,
  PROMOTION_CHANNEL,
  PROMOTION_TTL_DAYS,
  ROLLBACK_SEMANTICS,
  evaluatePromotionBoundary,
} from "../data4/daragadir-controlled-promotion";

const outDir = process.env.DATA_4_3F_OUT_DIR ?? ".tmp/data-4-3f/results";
const TIMEOUT_MS = 15000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3F requires ${name}`);
  return value;
}

async function restRows<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${table} read failed: ${response.status} ${await response.text()}`);
  return await response.json() as T[];
}

async function exactCount(table: string, params: Record<string, string>): Promise<number> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("select", "canonical_url");
  url.searchParams.set("limit", "1");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 206) throw new Error(`${table} count failed: ${response.status} ${await response.text()}`);
  const range = response.headers.get("content-range");
  const total = range?.split("/")[1];
  if (!total || total === "*") throw new Error(`Missing exact count for ${table}: ${range}`);
  return Number(total);
}

type RegistryRow = {
  source_domain: string;
  discovery_policy: string;
  display_policy: string;
  machine_gate: string;
  display_gate: string;
  allowed_discovery_channels: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

async function main(): Promise<void> {
  const registryRows = await restRows<RegistryRow>("source_policy_registry", {
    select: "source_domain,discovery_policy,display_policy,machine_gate,display_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status",
    source_domain: "eq.daragadir.com",
  });
  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);
  const registry = registryRows[0]!;

  const [totalRows, seedOnlyRows, freshConfirmedRows, canaryResidueRows] = await Promise.all([
    exactCount("source_offer_seeds", { source_domain: "eq.daragadir.com" }),
    exactCount("source_offer_seeds", { source_domain: "eq.daragadir.com", freshness_status: "eq.seed_only" }),
    exactCount("source_offer_seeds", { source_domain: "eq.daragadir.com", freshness_status: "eq.fresh_confirmed" }),
    exactCount("source_offer_seeds", { source_domain: "eq.daragadir.com", fresh_channels: "cs.{public_sitemap_presence}" }),
  ]);

  const registryEligible = registry.discovery_policy === "public_sitemap_only"
    && registry.display_policy === "canonical_link_only"
    && registry.machine_gate === "canonical_link_only"
    && registry.display_gate === "external_tail_link_only"
    && (registry.allowed_discovery_channels ?? []).includes("public_sitemap")
    && registry.max_revalidation_interval_days === PROMOTION_TTL_DAYS;

  const decision = evaluatePromotionBoundary({
    registryEligible,
    registryReviewStatus: registry.review_status,
    sitemapSignalPresent: true,
    requestedBatchSize: INITIAL_PERSISTENT_BATCH_SIZE,
    cumulativeAppliedRows: 0,
    candidateRows: 5564,
    driftedRows: canaryResidueRows,
  });

  const proof = {
    schemaVersion: "data-4-3f-controlled-promotion-design-v1",
    generatedAt: new Date().toISOString(),
    mode: "DESIGN_READ_ONLY",
    sourceDomain: "daragadir.com",
    totalRows,
    seedOnlyRows,
    freshConfirmedRows,
    previousCanaryResidueRows: canaryResidueRows,
    registryEligible,
    registryReviewStatus: registry.review_status,
    channel: PROMOTION_CHANNEL,
    ttlDays: PROMOTION_TTL_DAYS,
    initialBatchSize: INITIAL_PERSISTENT_BATCH_SIZE,
    maxBatchSize: MAX_BATCH_SIZE,
    maxCumulativeRowsBeforeRecertification: MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION,
    maxDriftRatio: MAX_DRIFT_RATIO,
    rollbackSemantics: ROLLBACK_SEMANTICS,
    promotionDecision: decision,
    databaseWrites: 0,
    freshnessWrites: 0,
    policyChanges: 0,
    productionActivation: false,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

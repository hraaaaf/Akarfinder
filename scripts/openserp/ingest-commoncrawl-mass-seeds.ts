#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — guarded Common Crawl seed importer.
// P0.1-MASS-INDEX-SOURCE-REGISTRY-OPERATIONAL-GATE
// COMMONCRAWL-IMPORT-TIMEOUT-HARDENING-V1
// COMMONCRAWL-OBSERVATION-REFRESH-V1
//
// Default mode is DRY RUN. --apply requires the exact same 3 Production
// ingestion flags as the scheduled OpenSERP writer. Writes ONLY authentic CDX
// observation evidence to source_offer_seeds. Existing Common Crawl rows can
// advance first/last observed timestamps, but this importer never promotes
// freshness and never writes discovery_candidates, listing_sources,
// property_listings, clusters or any public-facing table.
// Canonical Source Registry policy is re-read immediately before validation and
// the database RPC rechecks the current Source Policy Registry fail-closed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import {
  buildMassSeedInsertBatch,
  type CommonCrawlMassSeed,
  type SourceOfferSeedInsert,
} from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import { loadMassIndexSourcePolicies } from "@/lib/acquisition-scale-v1/mass-index-source-policy-db";
import { formatSupabaseError, withSupabaseRetry } from "@/lib/seed-freshness/supabase-retry";

const DEFAULT_INPUT = join(process.cwd(), "data/audits/raw-results/commoncrawl-registry-mass-seeds.jsonl");
// Production remainder imports reached PostgreSQL statement_timeout with 500-row
// statements. Keep RPC statements smaller and retry only transient failures.
export const UPSERT_CHUNK = 100;

type ObservationUpsertStats = {
  input_rows: number;
  inserted_rows: number;
  refreshed_rows: number;
  advanced_last_observed_rows: number;
  unchanged_rows: number;
  provider_conflict_rows: number;
  policy_rejected_rows: number;
  invalid_rows: number;
  freshness_promotions: number;
  detail_fetches: number;
};

function emptyObservationUpsertStats(): ObservationUpsertStats {
  return {
    input_rows: 0,
    inserted_rows: 0,
    refreshed_rows: 0,
    advanced_last_observed_rows: 0,
    unchanged_rows: 0,
    provider_conflict_rows: 0,
    policy_rejected_rows: 0,
    invalid_rows: 0,
    freshness_promotions: 0,
    detail_fetches: 0,
  };
}

function readIntegerField(record: Record<string, unknown>, key: keyof ObservationUpsertStats): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`invalid Common Crawl observation RPC result field ${key}: ${String(value)}`);
  }
  return value;
}

export function parseObservationUpsertStats(data: unknown): ObservationUpsertStats {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("invalid Common Crawl observation RPC result");
  }
  const record = data as Record<string, unknown>;
  return {
    input_rows: readIntegerField(record, "input_rows"),
    inserted_rows: readIntegerField(record, "inserted_rows"),
    refreshed_rows: readIntegerField(record, "refreshed_rows"),
    advanced_last_observed_rows: readIntegerField(record, "advanced_last_observed_rows"),
    unchanged_rows: readIntegerField(record, "unchanged_rows"),
    provider_conflict_rows: readIntegerField(record, "provider_conflict_rows"),
    policy_rejected_rows: readIntegerField(record, "policy_rejected_rows"),
    invalid_rows: readIntegerField(record, "invalid_rows"),
    freshness_promotions: readIntegerField(record, "freshness_promotions"),
    detail_fetches: readIntegerField(record, "detail_fetches"),
  };
}

function addObservationUpsertStats(
  total: ObservationUpsertStats,
  next: ObservationUpsertStats,
): ObservationUpsertStats {
  const merged = emptyObservationUpsertStats();
  for (const key of Object.keys(merged) as Array<keyof ObservationUpsertStats>) {
    merged[key] = total[key] + next[key];
  }
  return merged;
}

function parseArgs(argv: string[]): { apply: boolean; input: string } {
  let input = DEFAULT_INPUT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--input" && argv[i + 1]) input = argv[++i];
  }
  return { apply: argv.includes("--apply"), input };
}

function normalizedSeedDomain(seed: CommonCrawlMassSeed): string {
  const value = (seed as { source_domain?: unknown }).source_domain;
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function parseSeedJsonl(content: string): CommonCrawlMassSeed[] {
  const seeds: CommonCrawlMassSeed[] = [];
  for (const [index, line] of content.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      seeds.push(JSON.parse(line) as CommonCrawlMassSeed);
    } catch (error) {
      throw new Error(`invalid seed JSONL at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return seeds;
}

async function countSeeds(): Promise<number> {
  const client = getSupabaseServerClient();
  const { count, error } = await client
    .from("source_offer_seeds")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function upsertObservationChunk(
  rows: SourceOfferSeedInsert[],
  offset: number,
): Promise<ObservationUpsertStats> {
  const client = getSupabaseServerClient();
  return withSupabaseRetry(async () => {
    const { data, error } = await client.rpc("odm_upsert_commoncrawl_seed_observations_v1", {
      p_rows: rows,
    });
    if (error) throw error;
    const stats = parseObservationUpsertStats(data);
    if (stats.input_rows !== rows.length) {
      throw new Error(`Common Crawl observation RPC row-count mismatch: sent=${rows.length} received=${stats.input_rows}`);
    }
    if (stats.freshness_promotions !== 0 || stats.detail_fetches !== 0) {
      throw new Error("Common Crawl observation RPC violated observation-only contract");
    }
    return stats;
  }, `Common Crawl observation upsert offset=${offset} rows=${rows.length}`, { attempts: 4, baseDelayMs: 500 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawSeeds = parseSeedJsonl(readFileSync(args.input, "utf8"));
  const sourceDomains = [...new Set(rawSeeds.map(normalizedSeedDomain).filter(Boolean))].sort();
  const policies = await loadMassIndexSourcePolicies(sourceDomains);
  const policyEvaluation = evaluateMassIndexDomains(
    sourceDomains,
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );
  const allowed = new Set(policyEvaluation.allowedDomains);
  const policyRejectedRows = rawSeeds.filter((seed) => !allowed.has(normalizedSeedDomain(seed)));
  const policyAuthorizedSeeds = rawSeeds.filter((seed) => allowed.has(normalizedSeedDomain(seed)));
  const batch = buildMassSeedInsertBatch(policyAuthorizedSeeds);

  const policyRejectionBreakdown = policyEvaluation.decisions
    .filter((decision) => !decision.allowed)
    .reduce<Record<string, number>>((acc, decision) => {
      acc[decision.reason] = (acc[decision.reason] ?? 0) + 1;
      return acc;
    }, {});

  const summary = {
    input_path: args.input,
    raw_seed_rows: rawSeeds.length,
    policy_authorized_seed_rows: policyAuthorizedSeeds.length,
    policy_rejected_seed_rows: policyRejectedRows.length,
    policy_rejection_breakdown: policyRejectionBreakdown,
    validated_unique_seed_rows: batch.rows.length,
    rejected_rows: batch.rejections.length,
    rejection_breakdown: batch.rejections.reduce<Record<string, number>>((acc, rejection) => {
      acc[rejection.reason] = (acc[rejection.reason] ?? 0) + 1;
      return acc;
    }, {}),
    apply: args.apply,
    upsert_chunk_size: UPSERT_CHUNK,
  };

  if (rawSeeds.length > 0 && policyAuthorizedSeeds.length === 0) {
    throw new Error("P0.1 blocked Common Crawl seed import: zero policy-authorized seed rows");
  }

  if (!args.apply) {
    console.log(JSON.stringify({ ok: true, status: "DRY_RUN", ...summary }, null, 2));
    return;
  }

  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", ...summary }, null, 2));
    return;
  }

  const before = await countSeeds();
  let observationStats = emptyObservationUpsertStats();
  for (let offset = 0; offset < batch.rows.length; offset += UPSERT_CHUNK) {
    const chunkStats = await upsertObservationChunk(batch.rows.slice(offset, offset + UPSERT_CHUNK), offset);
    observationStats = addObservationUpsertStats(observationStats, chunkStats);
  }
  const after = await countSeeds();

  console.log(JSON.stringify({
    ok: true,
    status: "APPLIED",
    ...summary,
    seed_rows_before: before,
    seed_rows_after: after,
    newly_inserted_seed_rows: observationStats.inserted_rows,
    refreshed_observation_rows: observationStats.refreshed_rows,
    advanced_last_observed_rows: observationStats.advanced_last_observed_rows,
    unchanged_observation_rows: observationStats.unchanged_rows,
    provider_conflict_rows: observationStats.provider_conflict_rows,
    database_policy_rejected_rows: observationStats.policy_rejected_rows,
    database_invalid_rows: observationStats.invalid_rows,
    freshness_promotions: observationStats.freshness_promotions,
    detail_fetches: observationStats.detail_fetches,
    seed_row_count_delta: after - before,
  }, null, 2));
}

void main().catch((error) => {
  console.error(`[commoncrawl-import] fatal: ${formatSupabaseError(error)}`);
  process.exit(1);
});

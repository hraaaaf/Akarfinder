#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — guarded Common Crawl seed importer.
// P0.1-MASS-INDEX-SOURCE-REGISTRY-OPERATIONAL-GATE
//
// Default mode is DRY RUN. --apply requires the exact same 3 Production
// ingestion flags as the scheduled OpenSERP writer. Writes ONLY to
// source_offer_seeds with ignoreDuplicates=true; never to discovery_candidates,
// listing_sources, property_listings, clusters or any public-facing table.
// Canonical Source Registry policy is re-read immediately before validation so
// a stale artifact can never authorize a source/channel pair by itself.

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

const DEFAULT_INPUT = join(process.cwd(), "data/audits/raw-results/commoncrawl-registry-mass-seeds.jsonl");
const UPSERT_CHUNK = 500;

function parseArgs(argv: string[]): { apply: boolean; input: string } {
  let input = DEFAULT_INPUT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--input" && argv[i + 1]) input = argv[++i];
  }
  return { apply: argv.includes("--apply"), input };
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

async function insertChunk(rows: SourceOfferSeedInsert[]): Promise<void> {
  const client = getSupabaseServerClient();
  const { error } = await client
    .from("source_offer_seeds")
    .upsert(rows, { onConflict: "canonical_url", ignoreDuplicates: true });
  if (error) throw error;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawSeeds = parseSeedJsonl(readFileSync(args.input, "utf8"));
  const sourceDomains = [...new Set(rawSeeds.map((seed) => seed.source_domain.trim().toLowerCase()).filter(Boolean))].sort();
  const policies = await loadMassIndexSourcePolicies(sourceDomains);
  const policyEvaluation = evaluateMassIndexDomains(
    sourceDomains,
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );
  const allowed = new Set(policyEvaluation.allowedDomains);
  const policyRejectedRows = rawSeeds.filter((seed) => !allowed.has(seed.source_domain.trim().toLowerCase()));
  const policyAuthorizedSeeds = rawSeeds.filter((seed) => allowed.has(seed.source_domain.trim().toLowerCase()));
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
  };

  if (sourceDomains.length > 0 && policyEvaluation.allowedDomains.length === 0) {
    throw new Error("P0.1 blocked Common Crawl seed import: zero policy-authorized domains");
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
  for (let offset = 0; offset < batch.rows.length; offset += UPSERT_CHUNK) {
    await insertChunk(batch.rows.slice(offset, offset + UPSERT_CHUNK));
  }
  const after = await countSeeds();

  console.log(JSON.stringify({
    ok: true,
    status: "APPLIED",
    ...summary,
    seed_rows_before: before,
    seed_rows_after: after,
    newly_inserted_seed_rows: Math.max(0, after - before),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

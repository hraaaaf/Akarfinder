#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — guarded Common Crawl seed importer.
//
// Default mode is DRY RUN. --apply requires the exact same 3 Production
// ingestion flags as the scheduled OpenSERP writer. Writes ONLY to
// source_offer_seeds with ignoreDuplicates=true; never to discovery_candidates,
// listing_sources, property_listings, clusters or any public-facing table.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import {
  buildMassSeedInsertBatch,
  type CommonCrawlMassSeed,
  type SourceOfferSeedInsert,
} from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";

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
  const batch = buildMassSeedInsertBatch(rawSeeds);

  const summary = {
    input_path: args.input,
    raw_seed_rows: rawSeeds.length,
    validated_unique_seed_rows: batch.rows.length,
    rejected_rows: batch.rejections.length,
    rejection_breakdown: batch.rejections.reduce<Record<string, number>>((acc, rejection) => {
      acc[rejection.reason] = (acc[rejection.reason] ?? 0) + 1;
      return acc;
    }, {}),
    apply: args.apply,
  };

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

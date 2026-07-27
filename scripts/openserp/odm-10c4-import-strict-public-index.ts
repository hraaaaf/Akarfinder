#!/usr/bin/env tsx
// ODM-10C4 — strict Common Crawl public-index delta importer.
// URL-index metadata only. Approved real-estate domains only. Every inserted
// representation remains internal_signal_only and is finalized as ineligible.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import {
  buildMassSeedInsertBatch,
  type CommonCrawlMassSeed,
  type SourceOfferSeedInsert,
} from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";

const APPLY = process.argv.includes("--apply");
const INPUT = join(process.cwd(), "data/audits/raw-results/commoncrawl-registry-mass-seeds.jsonl");
const ALLOWED_DOMAINS = [
  "agenz.ma",
  "sarouty.ma",
  "1immo.ma",
  "mouldar.com",
  "soukimmobilier.com",
  "masaken.ma",
] as const;
const CDX_INDEXES = [
  "CC-MAIN-2026-25",
  "CC-MAIN-2026-21",
  "CC-MAIN-2026-17",
  "CC-MAIN-2026-12",
  "CC-MAIN-2026-08",
  "CC-MAIN-2026-04",
] as const;
const CHUNK = 300;

function parseJsonl(content: string): CommonCrawlMassSeed[] {
  return content.split("\n").filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line) as CommonCrawlMassSeed;
    } catch (error) {
      throw new Error(`invalid ODM-10C4 JSONL line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

async function existingCanonicalUrls(urls: string[]): Promise<Set<string>> {
  const client = getSupabaseServerClient();
  const existing = new Set<string>();
  for (let offset = 0; offset < urls.length; offset += CHUNK) {
    const { data, error } = await client
      .from("source_offer_seeds")
      .select("canonical_url")
      .in("canonical_url", urls.slice(offset, offset + CHUNK));
    if (error) throw new Error(`existing URL lookup failed: ${error.message}`);
    for (const row of data ?? []) existing.add(String(row.canonical_url));
  }
  return existing;
}

async function insertRows(rows: SourceOfferSeedInsert[]): Promise<void> {
  const client = getSupabaseServerClient();
  for (let offset = 0; offset < rows.length; offset += CHUNK) {
    const { error } = await client
      .from("source_offer_seeds")
      .upsert(rows.slice(offset, offset + CHUNK), { onConflict: "canonical_url", ignoreDuplicates: true });
    if (error) throw new Error(`ODM-10C4 seed upsert failed: ${error.message}`);
  }
}

async function main() {
  if (APPLY && !isOpenSerpIngestionCronAuthorized()) {
    throw new Error("ODM-10C4 write flags are not all enabled");
  }

  const raw = readFileSync(INPUT, "utf8");
  const parsed = parseJsonl(raw);
  const disallowed = parsed.filter((seed) => !ALLOWED_DOMAINS.includes(seed.source_domain as typeof ALLOWED_DOMAINS[number]));
  if (disallowed.length > 0) throw new Error(`ODM-10C4 artifact contains ${disallowed.length} disallowed-domain rows`);

  const batch = buildMassSeedInsertBatch(parsed);
  const allowedRows = batch.rows.filter((row) => ALLOWED_DOMAINS.includes(row.source_domain as typeof ALLOWED_DOMAINS[number]));
  const existing = await existingCanonicalUrls(allowedRows.map((row) => row.canonical_url));
  const delta = allowedRows.filter((row) => !existing.has(row.canonical_url));
  const now = new Date().toISOString();
  const rows: SourceOfferSeedInsert[] = delta.map((row) => ({
    ...row,
    metadata: {
      ...row.metadata,
      acquisition_lot: "ODM-10C4",
      display_policy: "internal_signal_only",
      public_admission: false,
    },
    created_at: now,
    updated_at: now,
  }));

  const runKey = `odm-10c4-${createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
  const artifactSha256 = createHash("sha256").update(raw).digest("hex");

  if (APPLY) {
    await insertRows(rows);
    const client = getSupabaseServerClient();
    const { data, error } = await client.rpc("odm_10c4_finalize_public_index_delta", {
      p_run_key: runKey,
      p_cdx_indexes: [...CDX_INDEXES],
      p_source_domains: [...ALLOWED_DOMAINS],
      p_qualified_urls: allowedRows.length,
      p_net_new_urls: rows.length,
      p_artifact_sha256: artifactSha256,
    });
    if (error) throw new Error(`ODM-10C4 finalization failed: ${error.message}`);
    console.log(JSON.stringify({ lot: "ODM-10C4", status: "APPLIED", run_key: runKey, qualified_urls: allowedRows.length, net_new_urls: rows.length, rejected_rows: batch.rejections.length, finalization: data }, null, 2));
    return;
  }

  console.log(JSON.stringify({ lot: "ODM-10C4", status: "DRY_RUN", run_key: runKey, qualified_urls: allowedRows.length, net_new_urls: rows.length, rejected_rows: batch.rejections.length, domains: ALLOWED_DOMAINS, indexes: CDX_INDEXES, admitted_public_urls: 0 }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { AdmissionDecision } from "@/lib/openserp-ingestion/national-admission";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { writeNationalIngestionRun } from "@/lib/openserp-ingestion/national-writer";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type ManifestItem = {
  discovery_id: string;
  query_id: string;
  original_status: string;
  canonical_url: string;
  decision: AdmissionDecision;
};

type Manifest = {
  schema_version: number;
  event: string;
  catalog_path: string;
  catalog_sha256: string;
  snapshot_sha256: string;
  scope: { rows: number; query_ids: number; unique_urls: number };
  replayed_rows: number;
  accepted_unique_urls: number;
  rejected_rows: number;
  accepted: ManifestItem[];
  rejected: unknown[];
  manifest_sha256: string;
};

async function existingUrls(urls: string[]): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const existing: string[] = [];
  for (let i = 0; i < urls.length; i += 100) {
    const response = await supabase.from("listing_sources").select("listing_url").in("listing_url", urls.slice(i, i + 100));
    if (response.error) throw new Error(`listing_sources verification failed: ${response.error.message}`);
    for (const row of response.data ?? []) if (typeof row.listing_url === "string") existing.push(row.listing_url);
  }
  return [...new Set(existing)].sort();
}

async function main() {
  if (!process.argv.includes("--apply")) throw new Error("refusing write without explicit --apply");
  if (process.env.GITHUB_REF !== "refs/heads/main") throw new Error(`refusing write outside main: ${process.env.GITHUB_REF ?? "unset"}`);
  if (!isOpenSerpIngestionCronAuthorized()) throw new Error("refusing write: OpenSERP production ingestion flags are not all enabled");

  const manifestArg = process.argv.find((arg) => arg.startsWith("--manifest="));
  const manifestPath = resolve(process.cwd(), manifestArg?.slice("--manifest=".length) || "tmp/avito-public-index-replay-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

  if (manifest.schema_version !== 1 || manifest.event !== "AVITO_PUBLIC_INDEX_REPLAY_MANIFEST") {
    throw new Error("invalid replay manifest schema/event");
  }
  const { manifest_sha256, ...core } = manifest;
  const recomputedHash = sha256(JSON.stringify(core));
  if (recomputedHash !== manifest_sha256) throw new Error(`manifest hash mismatch: expected ${manifest_sha256}, got ${recomputedHash}`);
  if (manifest.accepted.length !== manifest.accepted_unique_urls) throw new Error("manifest accepted count is not unique-url bounded");
  if (manifest.accepted.length === 0) throw new Error("refusing empty recovery manifest");

  const decisions = manifest.accepted.map((item) => item.decision);
  for (const [index, decision] of decisions.entries()) {
    if (!decision.admitted || decision.confidence !== "high" || !decision.classified) {
      throw new Error(`manifest item ${index} is not an admitted high-confidence classified decision`);
    }
    if (decision.classified.canonical_source_url !== manifest.accepted[index]!.canonical_url) {
      throw new Error(`manifest item ${index} canonical URL mismatch`);
    }
  }

  const urls = manifest.accepted.map((item) => item.canonical_url);
  const before = await existingUrls(urls);
  if (before.length !== 0) {
    throw new Error(`bounded scope drift: ${before.length}/${urls.length} manifest URLs already exist in listing_sources`);
  }

  const runId = `avito-public-index-recovery-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const result = await writeNationalIngestionRun({ runId, decisions });
  const after = await existingUrls(urls);

  console.log(JSON.stringify({
    event: "AVITO_PUBLIC_INDEX_REPLAY_APPLY_RESULT",
    run_id: runId,
    manifest_sha256,
    requested_unique_urls: urls.length,
    before_listing_sources: before.length,
    after_listing_sources: after.length,
    writer: result,
  }, null, 2));

  if (result.write_errors.length > 0) throw new Error(`official writer reported ${result.write_errors.length} write errors`);
  if (after.length !== urls.length) throw new Error(`post-write verification mismatch: expected ${urls.length}, found ${after.length}`);
  if (result.new_listing_sources !== urls.length) {
    throw new Error(`writer delta mismatch: expected ${urls.length} new_listing_sources, got ${result.new_listing_sources}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

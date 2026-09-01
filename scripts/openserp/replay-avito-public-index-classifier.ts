#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decideAdmission, type AdmissionDecision } from "@/lib/openserp-ingestion/national-admission";
import type { OpenSerpIngestionQuery } from "@/lib/openserp-ingestion/types";
import {
  AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_QUERY_IDS,
  AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS,
  AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS,
} from "./avito-public-index-replay-scope";

type QueryDefinition = {
  query_id: string;
  city?: string;
  district?: string | null;
  transaction?: string;
  transaction_type?: string;
  property_type?: string;
  query_text?: string;
  priority_tier?: number;
  priority?: string;
  target_domain?: string | null;
  query_family?: string;
  [key: string]: unknown;
};

type SnapshotRow = {
  id: string;
  discovery_query: string;
  result_rank: number | null;
  source_url: string | null;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovered_at: string;
  created_at: string;
  discovery_status: "accepted" | "rejected" | "unclassified";
  metadata: Record<string, unknown> | null;
};

type Snapshot = {
  event: string;
  captured_at: string;
  scope: { rows: number; query_ids: number; unique_urls: number };
  query_ids: string[];
  rows: SnapshotRow[];
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function extractQueries(parsed: unknown): QueryDefinition[] {
  if (Array.isArray(parsed)) return parsed as QueryDefinition[];
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["queries", "items", "query_universe"]) {
      if (Array.isArray(record[key])) return record[key] as QueryDefinition[];
    }
  }
  throw new Error("Unsupported query-universe JSON shape");
}

function toQuery(def: QueryDefinition): OpenSerpIngestionQuery {
  const transaction = def.transaction ?? def.transaction_type;
  if (transaction !== "sale" && transaction !== "rent") throw new Error(`invalid transaction for ${def.query_id}`);
  if (typeof def.city !== "string" || typeof def.property_type !== "string" || typeof def.query_text !== "string") {
    throw new Error(`incomplete query definition for ${def.query_id}`);
  }
  const priority = def.priority === "high" || def.priority === "medium" || def.priority === "low"
    ? def.priority
    : typeof def.priority_tier === "number"
      ? (def.priority_tier <= 1 ? "high" : def.priority_tier === 2 ? "medium" : "low")
      : "low";
  return {
    query_id: def.query_id,
    city: def.city,
    district: typeof def.district === "string" ? def.district : "",
    transaction_type: transaction,
    property_type: def.property_type,
    query_text: def.query_text,
    priority,
    target_domain: typeof def.target_domain === "string" ? def.target_domain : undefined,
    query_family: def.query_family === "brand_hint" ? "brand_hint" : "general",
  };
}

function engineOf(row: SnapshotRow): "bing" | "ecosia" | "duckduckgo" | "searxng_yandex" {
  const engine = row.metadata?.engine;
  if (engine === "bing" || engine === "ecosia" || engine === "duckduckgo" || engine === "searxng_yandex") return engine;
  throw new Error(`missing/invalid engine provenance for discovery ${row.id}`);
}

const snapshotArg = process.argv.find((arg) => arg.startsWith("--snapshot="));
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const snapshotPath = resolve(process.cwd(), snapshotArg?.slice("--snapshot=".length) || "tmp/avito-public-index-replay-snapshot.json");
const outputPath = resolve(process.cwd(), outputArg?.slice("--output=".length) || "tmp/avito-public-index-replay-manifest.json");
const catalogPath = resolve(process.cwd(), "data/openserp/query-universe-v1.json");

const snapshotBytes = readFileSync(snapshotPath);
const catalogBytes = readFileSync(catalogPath);
const snapshot = JSON.parse(snapshotBytes.toString("utf8")) as Snapshot;
const catalog = extractQueries(JSON.parse(catalogBytes.toString("utf8")));
const byId = new Map(catalog.map((def) => [def.query_id, def]));

if (snapshot.scope.rows !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS || snapshot.rows.length !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_ROWS) {
  throw new Error(`snapshot row count drift: ${snapshot.scope.rows}/${snapshot.rows.length}`);
}
if (snapshot.scope.query_ids !== AVITO_PUBLIC_INDEX_REPLAY_EXPECTED_QUERY_IDS) {
  throw new Error(`snapshot query-id count drift: ${snapshot.scope.query_ids}`);
}

const unresolved = [...AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS].filter((id) => !byId.has(id));
if (unresolved.length > 0) throw new Error(`official catalog missing ${unresolved.length} target query IDs: ${unresolved.join(",")}`);

const replayed: Array<{
  discovery_id: string;
  query_id: string;
  original_status: SnapshotRow["discovery_status"];
  decision: AdmissionDecision;
}> = [];

for (const row of snapshot.rows) {
  const def = byId.get(row.discovery_query);
  if (!def) throw new Error(`query definition disappeared during replay: ${row.discovery_query}`);
  const decision = decideAdmission({
    result: {
      url: row.source_url ?? row.canonical_url ?? "",
      title: row.title ?? "",
      snippet: row.snippet ?? "",
      rank: row.result_rank ?? 1,
    } as never,
    query: toQuery(def),
    engine: engineOf(row),
    discovered_at: row.discovered_at,
    fallbackRank: row.result_rank ?? 1,
  });
  replayed.push({ discovery_id: row.id, query_id: row.discovery_query, original_status: row.discovery_status, decision });
}

const acceptedByUrl = new Map<string, typeof replayed[number]>();
for (const item of replayed) {
  if (!item.decision.admitted || item.decision.confidence !== "high" || !item.decision.classified) continue;
  const canonical = item.decision.classified.canonical_source_url;
  if (!acceptedByUrl.has(canonical)) acceptedByUrl.set(canonical, item);
}
const accepted = [...acceptedByUrl.values()];
const rejected = replayed.filter((item) => !item.decision.admitted || item.decision.confidence !== "high" || !item.decision.classified);

const manifestCore = {
  schema_version: 1,
  event: "AVITO_PUBLIC_INDEX_REPLAY_MANIFEST",
  catalog_path: "data/openserp/query-universe-v1.json",
  catalog_sha256: sha256(catalogBytes),
  snapshot_sha256: sha256(snapshotBytes),
  scope: snapshot.scope,
  replayed_rows: replayed.length,
  accepted_unique_urls: accepted.length,
  rejected_rows: rejected.length,
  accepted: accepted.map((item) => ({
    discovery_id: item.discovery_id,
    query_id: item.query_id,
    original_status: item.original_status,
    canonical_url: item.decision.classified!.canonical_source_url,
    decision: item.decision,
  })),
  rejected: rejected.map((item) => ({
    discovery_id: item.discovery_id,
    query_id: item.query_id,
    original_status: item.original_status,
    reasons: item.decision.reasons,
    confidence: item.decision.confidence,
    canonical_url: item.decision.classified?.canonical_source_url ?? null,
  })),
};
const manifestHash = sha256(JSON.stringify(manifestCore));
const manifest = { ...manifestCore, manifest_sha256: manifestHash };
writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(JSON.stringify({
  event: "AVITO_PUBLIC_INDEX_REPLAY_CLASSIFIER_OK",
  catalog_rows: catalog.length,
  resolved_query_ids: AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.length,
  replayed_rows: replayed.length,
  accepted_unique_urls: accepted.length,
  rejected_rows: rejected.length,
  manifest_sha256: manifestHash,
  accepted_urls: accepted.map((item) => item.decision.classified!.canonical_source_url),
}, null, 2));

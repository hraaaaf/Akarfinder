#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";
import { AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS } from "./avito-public-index-replay-scope";

type QueryDefinition = {
  query_id: string;
  city?: string;
  district?: string | null;
  transaction?: string;
  transaction_type?: string;
  property_type?: string;
  language?: string;
  query_text?: string;
  priority_tier?: number;
  priority?: string;
  target_domain?: string | null;
  query_family?: string;
  [key: string]: unknown;
};

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

function tx(def: QueryDefinition): string | undefined {
  return def.transaction ?? def.transaction_type;
}

function semanticKey(def: QueryDefinition): string {
  return [def.city ?? "", def.district ?? "", tx(def) ?? "", def.property_type ?? "", def.language ?? "", def.target_domain ?? ""].join("::");
}

const catalogPath = resolve(process.cwd(), "data/openserp/query-universe-v1.json");
const catalog = extractQueries(JSON.parse(readFileSync(catalogPath, "utf8")));
const v2 = buildQueryUniverseV2().queries as QueryDefinition[];
const v2ById = new Map(v2.map((query) => [query.query_id, query]));
const v1BySemanticKey = new Map<string, QueryDefinition[]>();
for (const query of catalog) {
  const key = semanticKey(query);
  const rows = v1BySemanticKey.get(key) ?? [];
  rows.push(query);
  v1BySemanticKey.set(key, rows);
}

const resolved = AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.map((queryId) => {
  const v2Definition = v2ById.get(queryId) ?? null;
  const v1Matches = v2Definition ? (v1BySemanticKey.get(semanticKey(v2Definition)) ?? []) : [];
  return { query_id: queryId, v2_definition: v2Definition, v1_semantic_matches: v1Matches };
});
const missingV2 = resolved.filter((item) => item.v2_definition === null).map((item) => item.query_id);
const ambiguousV1 = resolved.filter((item) => item.v1_semantic_matches.length !== 1).map((item) => ({ query_id: item.query_id, matches: item.v1_semantic_matches.length }));

console.log(JSON.stringify({
  event: "AVITO_PUBLIC_INDEX_REPLAY_QUERY_RESOLUTION",
  official_catalog_path: "data/openserp/query-universe-v1.json",
  official_catalog_rows: catalog.length,
  generated_v2_rows: v2.length,
  requested_ids: AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.length,
  resolved_v2_ids: resolved.length - missingV2.length,
  exact_v1_semantic_matches: resolved.length - ambiguousV1.length,
  missing_v2_ids: missingV2,
  non_unique_v1_semantic_matches: ambiguousV1,
  definitions: resolved,
}, null, 2));

if (missingV2.length > 0 || ambiguousV1.length > 0) process.exitCode = 2;

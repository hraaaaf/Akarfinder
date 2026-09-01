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

function baseIdentity(def: QueryDefinition): string {
  return JSON.stringify({
    query_id: def.query_id,
    city: def.city ?? null,
    district: def.district ?? null,
    transaction: tx(def) ?? null,
    property_type: def.property_type ?? null,
    language: def.language ?? null,
    query_text: def.query_text ?? null,
    priority_tier: def.priority_tier ?? null,
    target_domain: def.target_domain ?? null,
    query_family: def.query_family ?? null,
  });
}

const catalogPath = resolve(process.cwd(), "data/openserp/query-universe-v1.json");
const catalog = extractQueries(JSON.parse(readFileSync(catalogPath, "utf8")));
const v2 = buildQueryUniverseV2().queries as QueryDefinition[];
const v2ById = new Map(v2.map((query) => [query.query_id, query]));

const v1BaseMismatches = catalog.flatMap((v1) => {
  const generated = v2ById.get(v1.query_id);
  if (!generated) return [{ query_id: v1.query_id, reason: "missing_from_v2" }];
  if (baseIdentity(generated) !== baseIdentity(v1)) return [{ query_id: v1.query_id, reason: "definition_drift" }];
  return [];
});

const resolved = AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.map((queryId) => ({
  query_id: queryId,
  definition: v2ById.get(queryId) ?? null,
}));
const missing = resolved.filter((item) => item.definition === null).map((item) => item.query_id);

console.log(JSON.stringify({
  event: "AVITO_PUBLIC_INDEX_REPLAY_QUERY_RESOLUTION",
  official_catalog_path: "data/openserp/query-universe-v1.json",
  official_catalog_rows: catalog.length,
  generated_v2_rows: v2.length,
  v1_base_mismatches: v1BaseMismatches,
  requested_ids: AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.length,
  resolved_ids: resolved.length - missing.length,
  missing_ids: missing,
  definitions: resolved.filter((item) => item.definition !== null),
}, null, 2));

if (v1BaseMismatches.length > 0 || missing.length > 0) process.exitCode = 2;

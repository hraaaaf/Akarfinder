#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const TARGET_QUERY_IDS = [
  "nqu2-00e2245f79c651cf",
  "nqu2-289717bce7b589d1",
  "nqu2-312da9665d977a88",
  "nqu2-3f04a6411d6f5583",
  "nqu2-5a992127cef8f8c8",
  "nqu2-5b6f451c48f1edb6",
  "nqu2-61c87c42cc85dc4f",
  "nqu2-6c39d3cbf6fff899",
  "nqu2-708082eb104342c8",
  "nqu2-76000361b50188cc",
  "nqu2-8f515454712f57d4",
  "nqu2-93fe3ae5cf1a2b0d",
  "nqu2-a63fd58bfa378e0b",
  "nqu2-ad16afe874aca2db",
  "nqu2-aff2f8b77d0fa02c",
  "nqu2-cac4c7c6c302be1b",
  "nqu2-cea3a04c3216fb77",
  "nqu2-d75f11fb30e6cfd0",
  "nqu2-ddc17f2a37c932f5",
  "nqu2-df41d0874be4e1de",
  "nqu2-e2210254994e8893",
  "nqu2-ed52ce90f88b20e8",
  "nqu2-f1339f2c34753f94",
] as const;

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

const catalogPath = resolve(process.cwd(), "data/openserp/query-universe-v1.json");
const catalog = extractQueries(JSON.parse(readFileSync(catalogPath, "utf8")));
const byId = new Map(catalog.map((query) => [query.query_id, query]));
const resolved = TARGET_QUERY_IDS.map((queryId) => ({ query_id: queryId, definition: byId.get(queryId) ?? null }));
const missing = resolved.filter((item) => item.definition === null).map((item) => item.query_id);

console.log(JSON.stringify({
  event: "AVITO_PUBLIC_INDEX_REPLAY_QUERY_RESOLUTION",
  catalog_path: "data/openserp/query-universe-v1.json",
  catalog_rows: catalog.length,
  requested_ids: TARGET_QUERY_IDS.length,
  resolved_ids: resolved.length - missing.length,
  missing_ids: missing,
  definitions: resolved.filter((item) => item.definition !== null),
}, null, 2));

if (missing.length > 0) process.exitCode = 2;

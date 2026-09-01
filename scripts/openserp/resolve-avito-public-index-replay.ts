#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const catalogPath = resolve(process.cwd(), "data/openserp/query-universe-v1.json");
const catalog = extractQueries(JSON.parse(readFileSync(catalogPath, "utf8")));
const byId = new Map(catalog.map((query) => [query.query_id, query]));
const resolved = AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.map((queryId) => ({ query_id: queryId, definition: byId.get(queryId) ?? null }));
const missing = resolved.filter((item) => item.definition === null).map((item) => item.query_id);

console.log(JSON.stringify({
  event: "AVITO_PUBLIC_INDEX_REPLAY_QUERY_RESOLUTION",
  catalog_path: "data/openserp/query-universe-v1.json",
  catalog_rows: catalog.length,
  requested_ids: AVITO_PUBLIC_INDEX_REPLAY_QUERY_IDS.length,
  resolved_ids: resolved.length - missing.length,
  missing_ids: missing,
  definitions: resolved.filter((item) => item.definition !== null),
}, null, 2));

if (missing.length > 0) process.exitCode = 2;

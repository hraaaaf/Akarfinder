#!/usr/bin/env tsx
// DATA-FUNNEL-RECOVERY-1
// Read-only replay of persisted discovery_candidates through the CURRENT
// classifier/admission code. It never writes to Supabase and exists to measure
// old_status -> new_status transitions before any recovery backfill is allowed.

import { writeFileSync } from "node:fs";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { decideAdmission } from "@/lib/openserp-ingestion/national-admission";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";
import type { OpenSerpIngestionQuery } from "@/lib/openserp-ingestion/types";

type OldStatus = "accepted" | "rejected" | "unclassified";
type ReplayRow = {
  id: string;
  discovery_query: string;
  result_rank: number | null;
  source_url: string | null;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_status: OldStatus;
  discovered_at: string;
  metadata: Record<string, unknown> | null;
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function statusFor(decision: ReturnType<typeof decideAdmission>): OldStatus {
  if (decision.admitted) return "accepted";
  return decision.classified?.classification_lane === "reject_out_of_scope" ? "rejected" : "unclassified";
}

function toQuery(item: ReturnType<typeof buildQueryUniverseV2>["queries"][number]): OpenSerpIngestionQuery {
  return {
    query_id: item.query_id,
    city: item.city,
    district: item.district ?? "",
    transaction_type: item.transaction,
    property_type: item.property_type,
    query_text: item.query_text,
    priority: item.priority_tier <= 1 ? "high" : item.priority_tier === 2 ? "medium" : "low",
    target_domain: item.target_domain ?? undefined,
    query_family: item.query_family,
  };
}

function safeEngine(metadata: Record<string, unknown> | null): "bing" | "ecosia" | "duckduckgo" | "searxng_yandex" | null {
  const value = metadata?.engine;
  return value === "bing" || value === "ecosia" || value === "duckduckgo" || value === "searxng_yandex" ? value : null;
}

async function loadRows(maxRows: number | null): Promise<ReplayRow[]> {
  const supabase = getSupabaseServerClient();
  const out: ReplayRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = maxRows == null ? from + pageSize - 1 : Math.min(from + pageSize - 1, maxRows - 1);
    if (maxRows != null && from >= maxRows) break;
    const response = await supabase
      .from("discovery_candidates")
      .select("id,discovery_query,result_rank,source_url,canonical_url,title,snippet,discovery_status,discovered_at,metadata")
      .order("created_at", { ascending: true })
      .range(from, to);
    if (response.error) throw new Error(`discovery replay read failed: ${response.error.message}`);
    const rows = (response.data ?? []) as ReplayRow[];
    out.push(...rows);
    if (rows.length < pageSize || (maxRows != null && out.length >= maxRows)) break;
  }
  return maxRows == null ? out : out.slice(0, maxRows);
}

async function main() {
  const maxArg = argValue("max");
  const maxRows = maxArg ? Math.max(1, Number.parseInt(maxArg, 10)) : null;
  if (maxArg && !Number.isFinite(maxRows)) throw new Error("--max must be an integer");
  const outPath = argValue("out");

  const universe = buildQueryUniverseV2();
  const queryById = new Map(universe.queries.map((item) => [item.query_id, item]));
  const rows = await loadRows(maxRows);

  const transitions = new Map<string, number>();
  const uniqueRecovered = new Set<string>();
  const uniqueRegressed = new Set<string>();
  const recoveredByDomain = new Map<string, Set<string>>();
  let replayed = 0;
  let missingQuery = 0;
  let missingEngine = 0;
  let unparseable = 0;

  const samples: Array<{ canonical_url: string; old_status: OldStatus; new_status: OldStatus; domain: string | null; reasons: string[] }> = [];

  for (const row of rows) {
    const queryDef = queryById.get(row.discovery_query);
    if (!queryDef) {
      missingQuery += 1;
      continue;
    }
    const engine = safeEngine(row.metadata);
    if (!engine) {
      missingEngine += 1;
      continue;
    }
    const url = row.source_url ?? row.canonical_url;
    if (!url) {
      unparseable += 1;
      continue;
    }

    const decision = decideAdmission({
      result: {
        url,
        title: row.title ?? "",
        snippet: row.snippet ?? "",
        rank: row.result_rank ?? 1,
      } as never,
      query: toQuery(queryDef),
      engine,
      discovered_at: row.discovered_at,
      fallbackRank: row.result_rank ?? 1,
    });
    if (!decision.classified) {
      unparseable += 1;
      continue;
    }

    replayed += 1;
    const next = statusFor(decision);
    const key = `${row.discovery_status}->${next}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    const canonical = decision.classified.canonical_source_url;
    if (row.discovery_status !== "accepted" && next === "accepted") {
      uniqueRecovered.add(canonical);
      const domainSet = recoveredByDomain.get(decision.classified.source_domain) ?? new Set<string>();
      domainSet.add(canonical);
      recoveredByDomain.set(decision.classified.source_domain, domainSet);
    }
    if (row.discovery_status === "accepted" && next !== "accepted") uniqueRegressed.add(canonical);
    if (row.discovery_status !== next && samples.length < 100) {
      samples.push({
        canonical_url: canonical,
        old_status: row.discovery_status,
        new_status: next,
        domain: decision.classified.source_domain,
        reasons: decision.reasons,
      });
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: "read_only_no_writes",
    rows_loaded: rows.length,
    rows_replayed: replayed,
    rows_missing_query_definition: missingQuery,
    rows_missing_engine_provenance: missingEngine,
    rows_unparseable: unparseable,
    transitions: Object.fromEntries([...transitions.entries()].sort(([a], [b]) => a.localeCompare(b))),
    unique_urls_recovered_to_accepted: uniqueRecovered.size,
    unique_urls_regressed_from_accepted: uniqueRegressed.size,
    recovered_unique_urls_by_domain: Object.fromEntries(
      [...recoveredByDomain.entries()].sort((a, b) => b[1].size - a[1].size).map(([domain, urls]) => [domain, urls.size]),
    ),
    changed_samples_capped_100: samples,
  };

  const json = JSON.stringify(report, null, 2);
  console.log(json);
  if (outPath) writeFileSync(outPath, json, "utf8");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

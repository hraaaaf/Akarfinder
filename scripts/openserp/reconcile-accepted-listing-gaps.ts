#!/usr/bin/env tsx
// DATA-FUNNEL-RECOVERY-1
// Self-healing reconciliation for the proven gap where a discovery row can be
// accepted before the time-budgeted writer reaches property_listings/listing_sources.
//
// Safety:
// - dry-run unless --apply is explicit;
// - --apply requires the exact same three Production ingestion flags as cron;
// - only approved-domain candidates that CURRENT code re-admits with HIGH
//   confidence are eligible;
// - canonical URLs already present in listing_sources are skipped;
// - decisions are deduped by canonical URL;
// - writes reuse writeNationalIngestionRun, preserving the normal idempotent
//   property/source/cluster path. No custom SQL write bypass exists here.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { decideAdmission, type AdmissionDecision } from "@/lib/openserp-ingestion/national-admission";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { buildQueryUniverseV2 } from "@/lib/openserp-ingestion/query-universe-v2";
import type { OpenSerpIngestionQuery } from "@/lib/openserp-ingestion/types";
import { writeNationalIngestionRun } from "@/lib/openserp-ingestion/national-writer";

type DiscoveryRow = {
  id: string;
  discovery_query: string;
  result_rank: number | null;
  source_url: string | null;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_status: "accepted" | "rejected" | "unclassified";
  discovered_at: string;
  metadata: Record<string, unknown> | null;
};

function parseMode(): "dry-run" | "apply" {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply && dryRun) throw new Error("--apply and --dry-run are mutually exclusive");
  return apply ? "apply" : "dry-run";
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

async function loadAllDiscoveries(): Promise<DiscoveryRow[]> {
  const supabase = getSupabaseServerClient();
  const out: DiscoveryRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await supabase
      .from("discovery_candidates")
      .select("id,discovery_query,result_rank,source_url,canonical_url,title,snippet,discovery_status,discovered_at,metadata")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (response.error) throw new Error(`discovery read failed: ${response.error.message}`);
    const rows = (response.data ?? []) as DiscoveryRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

async function loadExistingSourceUrls(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const out = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await supabase
      .from("listing_sources")
      .select("listing_url")
      .range(from, from + pageSize - 1);
    if (response.error) throw new Error(`listing_sources read failed: ${response.error.message}`);
    const rows = (response.data ?? []) as Array<{ listing_url: string | null }>;
    for (const row of rows) if (row.listing_url) out.add(row.listing_url);
    if (rows.length < pageSize) break;
  }
  return out;
}

async function main() {
  const mode = parseMode();
  const universe = buildQueryUniverseV2();
  const queryById = new Map(universe.queries.map((item) => [item.query_id, item]));
  const [rows, existingSourceUrls] = await Promise.all([loadAllDiscoveries(), loadExistingSourceUrls()]);

  const selectedByUrl = new Map<string, { decision: AdmissionDecision; oldStatus: DiscoveryRow["discovery_status"] }>();
  let alreadyLinked = 0;
  let missingQueryDefinition = 0;
  let missingEngine = 0;
  let notHighConfidence = 0;

  for (const row of rows) {
    if (!row.canonical_url) continue;
    if (existingSourceUrls.has(row.canonical_url)) {
      alreadyLinked += 1;
      continue;
    }
    const queryDef = queryById.get(row.discovery_query);
    if (!queryDef) {
      missingQueryDefinition += 1;
      continue;
    }
    const engine = safeEngine(row.metadata);
    if (!engine) {
      missingEngine += 1;
      continue;
    }
    const url = row.source_url ?? row.canonical_url;
    const decision = decideAdmission({
      result: { url, title: row.title ?? "", snippet: row.snippet ?? "", rank: row.result_rank ?? 1 } as never,
      query: toQuery(queryDef),
      engine,
      discovered_at: row.discovered_at,
      fallbackRank: row.result_rank ?? 1,
    });
    if (!decision.admitted || decision.confidence !== "high" || !decision.classified) {
      notHighConfidence += 1;
      continue;
    }
    const canonical = decision.classified.canonical_source_url;
    if (existingSourceUrls.has(canonical)) continue;
    if (!selectedByUrl.has(canonical)) selectedByUrl.set(canonical, { decision, oldStatus: row.discovery_status });
  }

  const selected = [...selectedByUrl.values()];
  const acceptedGapCount = selected.filter((item) => item.oldStatus === "accepted").length;
  const recoveredFromRejected = selected.filter((item) => item.oldStatus === "rejected").length;
  const recoveredFromUnclassified = selected.filter((item) => item.oldStatus === "unclassified").length;
  const byDomain: Record<string, number> = {};
  for (const item of selected) {
    const domain = item.decision.classified!.source_domain;
    byDomain[domain] = (byDomain[domain] ?? 0) + 1;
  }

  const plan = {
    mode,
    discoveries_scanned: rows.length,
    existing_source_urls: existingSourceUrls.size,
    already_linked_rows_seen: alreadyLinked,
    missing_query_definition: missingQueryDefinition,
    missing_engine_provenance: missingEngine,
    non_high_confidence_or_not_admitted: notHighConfidence,
    unique_urls_selected: selected.length,
    selected_existing_accepted_gap: acceptedGapCount,
    selected_recovered_from_rejected: recoveredFromRejected,
    selected_recovered_from_unclassified: recoveredFromUnclassified,
    selected_by_domain: Object.fromEntries(Object.entries(byDomain).sort((a, b) => b[1] - a[1])),
  };

  console.log(JSON.stringify({ event: "DATA_FUNNEL_RECONCILIATION_PLAN", ...plan }, null, 2));
  if (mode === "dry-run") return;

  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", ...plan }, null, 2));
    return;
  }

  if (selected.length === 0) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_NOTHING_TO_RECONCILE", ...plan }, null, 2));
    return;
  }

  const runId = `data-funnel-recovery-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const result = await writeNationalIngestionRun({
    runId,
    decisions: selected.map((item) => item.decision),
  });

  console.log(JSON.stringify({ ok: result.write_errors.length === 0, status: "APPLY_COMPLETED", run_id: runId, plan, result }, null, 2));
  if (result.write_errors.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

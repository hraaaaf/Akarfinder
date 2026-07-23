import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { buildBulkHarvestQueries, BULK_HARVEST_BUDGET } from "@/lib/serper-mass-harvest/bulk-plan";
import { normalizeHarvestResults } from "@/lib/serper-mass-harvest/core";
import type { HarvestObservation, HarvestQuery, HarvestRawResult, HarvestSourceId } from "@/lib/serper-mass-harvest/types";

const RESULTS_PER_QUERY = 10;
const PROVIDER_TIMEOUT_MS = 12_000;
const READ_PAGE_SIZE = 1000;
const PROVIDER = "serper_mass_harvest";
const SERPER_SEED_CHANNEL = "serper_search";

type ExistingSeed = {
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  metadata: Record<string, unknown> | null;
  freshness_status: string;
  fresh_last_seen_at: string | null;
  fresh_channels: string[];
};

type SourceMetrics = {
  calls: number;
  raw: number;
  observations: number;
  accepted: number;
  rejected: number;
  unclassified: number;
  new_unique: number;
  duplicates_or_known: number;
  discovery_rows_written: number;
  gateway_new_seeds: number;
  gateway_refreshed_seeds: number;
};

function emptyMetrics(): SourceMetrics {
  return {
    calls: 0,
    raw: 0,
    observations: 0,
    accepted: 0,
    rejected: 0,
    unclassified: 0,
    new_unique: 0,
    duplicates_or_known: 0,
    discovery_rows_written: 0,
    gateway_new_seeds: 0,
    gateway_refreshed_seeds: 0,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function queryHash(query: string): string {
  return sha256(`${PROVIDER}:${query.trim().replace(/\s+/g, " ").toLowerCase()}`);
}

function contentFingerprint(title: string | null, snippet: string | null): string {
  return sha256(`${title ?? ""}\n${snippet ?? ""}`);
}

async function fetchSerperResults(input: {
  endpoint: string;
  apiKey: string;
  query: string;
}): Promise<HarvestRawResult[]> {
  const endpointUrl = new URL(input.endpoint);
  const nativeSerper = endpointUrl.hostname === "google.serper.dev";
  const response = nativeSerper
    ? await fetch(input.endpoint, {
        method: "POST",
        headers: {
          "X-API-KEY": input.apiKey,
          "Content-Type": "application/json",
          "User-Agent": "AkarFinder Serper 1900 Bulk Harvest",
        },
        body: JSON.stringify({ q: input.query, num: RESULTS_PER_QUERY, gl: "ma", hl: "fr" }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      })
    : await fetch(`${input.endpoint}?q=${encodeURIComponent(input.query)}&num=${RESULTS_PER_QUERY}`, {
        method: "GET",
        headers: {
          "X-API-KEY": input.apiKey,
          "User-Agent": "AkarFinder Serper 1900 Bulk Harvest",
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

  if ([401, 402, 403, 429].includes(response.status)) {
    throw new Error(`FATAL_PROVIDER_HTTP_${response.status}`);
  }
  if (!response.ok) throw new Error(`Serper provider HTTP ${response.status}`);
  const data = (await response.json()) as { organic?: HarvestRawResult[]; results?: HarvestRawResult[] };
  return (data.organic ?? data.results ?? []).slice(0, RESULTS_PER_QUERY);
}

async function readKnownCanonicalUrls(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const output = new Set<string>();
  for (const table of ["discovery_candidates", "source_offer_seeds"] as const) {
    let from = 0;
    while (true) {
      const response = await supabase
        .from(table)
        .select("canonical_url")
        .not("canonical_url", "is", null)
        .range(from, from + READ_PAGE_SIZE - 1);
      if (response.error) throw new Error(`${table} preload failed: ${response.error.message}`);
      const rows = (response.data ?? []) as Array<{ canonical_url: string | null }>;
      for (const row of rows) if (row.canonical_url) output.add(row.canonical_url);
      if (rows.length < READ_PAGE_SIZE) break;
      from += READ_PAGE_SIZE;
    }
  }
  return output;
}

async function readExistingSeeds(): Promise<Map<string, ExistingSeed>> {
  const supabase = getSupabaseServerClient();
  const output = new Map<string, ExistingSeed>();
  let from = 0;
  while (true) {
    const response = await supabase
      .from("source_offer_seeds")
      .select("canonical_url,source_domain,seed_provider,first_observed_at,last_observed_at,observation_count,metadata,freshness_status,fresh_last_seen_at,fresh_channels")
      .range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`source_offer_seeds preload failed: ${response.error.message}`);
    const rows = (response.data ?? []) as ExistingSeed[];
    for (const row of rows) output.set(row.canonical_url, row);
    if (rows.length < READ_PAGE_SIZE) break;
    from += READ_PAGE_SIZE;
  }
  return output;
}

async function readExecutedQueryHashes(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const output = new Set<string>();
  let from = 0;
  while (true) {
    const response = await supabase
      .from("discovery_candidates")
      .select("query_hash")
      .eq("provider", PROVIDER)
      .range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`executed-query preload failed: ${response.error.message}`);
    const rows = (response.data ?? []) as Array<{ query_hash: string }>;
    for (const row of rows) output.add(row.query_hash);
    if (rows.length < READ_PAGE_SIZE) break;
    from += READ_PAGE_SIZE;
  }
  return output;
}

async function persistDiscovery(query: HarvestQuery, observations: HarvestObservation[], runId: string): Promise<number> {
  if (observations.length === 0) return 0;
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const hash = queryHash(query.query);
  const rows = observations.map((observation) => ({
    provider: PROVIDER,
    discovery_query: query.query,
    query_hash: hash,
    result_rank: observation.result_rank,
    source_domain: observation.source_domain,
    source_url: observation.source_url,
    canonical_url: observation.canonical_url,
    title: observation.title,
    snippet: observation.snippet,
    discovered_at: now,
    last_seen_at: now,
    discovery_status: observation.discovery_status,
    content_fingerprint: contentFingerprint(observation.title, observation.snippet),
    metadata: {
      ingestion_run_id: runId,
      harvest_phase: "bulk_1900",
      harvest_source_id: query.source_id,
      harvest_query_id: query.id,
      city: query.city ?? null,
      property_type: query.property_type ?? null,
      intent: query.intent ?? null,
      eligibility_reasons: observation.eligibility_reasons,
      retained_for_future_gate: true,
      no_direct_property_listing_write: true,
    },
  }));

  const response = await supabase.from("discovery_candidates").insert(rows);
  if (response.error) throw new Error(`discovery_candidates insert failed: ${response.error.message}`);
  return rows.length;
}

async function promoteAcceptedToGatewaySeeds(input: {
  query: HarvestQuery;
  observations: HarvestObservation[];
  seedMap: Map<string, ExistingSeed>;
  runId: string;
}): Promise<{ newSeeds: number; refreshedSeeds: number }> {
  const accepted = input.observations.filter((observation) => observation.discovery_status === "accepted");
  if (accepted.length === 0) return { newSeeds: 0, refreshedSeeds: 0 };

  const supabase = getSupabaseServerClient();
  let newSeeds = 0;
  let refreshedSeeds = 0;

  for (const observation of accepted) {
    const now = new Date().toISOString();
    const existing = input.seedMap.get(observation.canonical_url);
    const previousMetadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
    const freshChannels = [...new Set([...(existing?.fresh_channels ?? []), SERPER_SEED_CHANNEL])];
    const row = {
      canonical_url: observation.canonical_url,
      source_domain: observation.source_domain,
      seed_provider: existing?.seed_provider ?? SERPER_SEED_CHANNEL,
      first_observed_at: existing?.first_observed_at ?? now,
      last_observed_at: now,
      observation_count: (existing?.observation_count ?? 0) + 1,
      metadata: {
        ...previousMetadata,
        serper_search: {
          run_id: input.runId,
          title: observation.title,
          snippet: observation.snippet,
          query: input.query.query,
          query_id: input.query.id,
          source_id: input.query.source_id,
          city: input.query.city ?? null,
          property_type: input.query.property_type ?? null,
          intent: input.query.intent ?? null,
          observed_at: now,
        },
      },
      freshness_status: "fresh_confirmed",
      fresh_last_seen_at: now,
      fresh_channels: freshChannels,
      updated_at: now,
    };

    const response = await supabase
      .from("source_offer_seeds")
      .upsert(row, { onConflict: "canonical_url" });
    if (response.error) throw new Error(`source_offer_seeds gateway upsert failed: ${response.error.message}`);

    input.seedMap.set(observation.canonical_url, {
      ...row,
      metadata: row.metadata,
    });
    if (existing) refreshedSeeds += 1;
    else newSeeds += 1;
  }

  return { newSeeds, refreshedSeeds };
}

async function main(): Promise<void> {
  if (process.env.SERPER_MASS_HARVEST_ENABLED !== "true") {
    throw new Error("SERPER_MASS_HARVEST_ENABLED must be exactly 'true'");
  }
  if (process.env.SERPER_MASS_HARVEST_BULK_APPLY !== "true") {
    throw new Error("SERPER_MASS_HARVEST_BULK_APPLY must be exactly 'true'");
  }

  const apiKey = process.env.SERPER_MASS_HARVEST_API_KEY ?? process.env.SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing SERPER_MASS_HARVEST_API_KEY or SEARCH_API_KEY");
  const endpoint = process.env.SERPER_MASS_HARVEST_ENDPOINT ?? process.env.SEARCH_API_ENDPOINT ?? "https://google.serper.dev/search";
  const runId = process.env.SERPER_MASS_HARVEST_RUN_ID ?? `serper-bulk-1900-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const queries = buildBulkHarvestQueries();
  if (queries.length !== BULK_HARVEST_BUDGET) throw new Error("Bulk plan must contain exactly 1900 queries");

  const knownBeforeRun = await readKnownCanonicalUrls();
  const seedMap = await readExistingSeeds();
  const executedQueryHashes = await readExecutedQueryHashes();
  const seenThisRun = new Set<string>();
  const bySource = new Map<HarvestSourceId, SourceMetrics>();

  let callsSucceeded = 0;
  let callsFailed = 0;
  let callsSkippedResume = 0;
  let rawTotal = 0;
  let observationsTotal = 0;
  let discoveryRowsWritten = 0;
  let gatewayNewSeeds = 0;
  let gatewayRefreshedSeeds = 0;

  for (let index = 0; index < queries.length; index += 1) {
    const query = queries[index];
    const hash = queryHash(query.query);
    const sourceMetrics = bySource.get(query.source_id) ?? emptyMetrics();
    bySource.set(query.source_id, sourceMetrics);

    if (executedQueryHashes.has(hash)) {
      callsSkippedResume += 1;
      continue;
    }

    sourceMetrics.calls += 1;
    try {
      const raw = await fetchSerperResults({ endpoint, apiKey, query: query.query });
      callsSucceeded += 1;
      rawTotal += raw.length;
      sourceMetrics.raw += raw.length;

      const observations = normalizeHarvestResults(query, raw);
      observationsTotal += observations.length;
      sourceMetrics.observations += observations.length;

      for (const observation of observations) {
        const known = knownBeforeRun.has(observation.canonical_url) || seenThisRun.has(observation.canonical_url);
        if (known) sourceMetrics.duplicates_or_known += 1;
        else sourceMetrics.new_unique += 1;
        seenThisRun.add(observation.canonical_url);

        if (observation.discovery_status === "accepted") sourceMetrics.accepted += 1;
        else if (observation.discovery_status === "rejected") sourceMetrics.rejected += 1;
        else sourceMetrics.unclassified += 1;
      }

      // Checkpoint every successful query: all normalized SERP observations are retained in DB,
      // including rejected/unclassified rows, so nothing useful is lost if the workflow stops later.
      const written = await persistDiscovery(query, observations, runId);
      discoveryRowsWritten += written;
      sourceMetrics.discovery_rows_written += written;

      // Only registry-gated accepted detail URLs enter the public thin-index reservoir.
      // Unclassified/rejected observations remain retained in discovery_candidates for future source gates.
      const promoted = await promoteAcceptedToGatewaySeeds({ query, observations, seedMap, runId });
      gatewayNewSeeds += promoted.newSeeds;
      gatewayRefreshedSeeds += promoted.refreshedSeeds;
      sourceMetrics.gateway_new_seeds += promoted.newSeeds;
      sourceMetrics.gateway_refreshed_seeds += promoted.refreshedSeeds;
      executedQueryHashes.add(hash);

      if ((index + 1) % 25 === 0 || index + 1 === queries.length) {
        console.error(JSON.stringify({
          progress: index + 1,
          total: queries.length,
          calls_succeeded: callsSucceeded,
          calls_failed: callsFailed,
          calls_skipped_resume: callsSkippedResume,
          discovery_rows_written: discoveryRowsWritten,
          gateway_new_seeds: gatewayNewSeeds,
          gateway_refreshed_seeds: gatewayRefreshedSeeds,
        }));
      }
    } catch (error) {
      callsFailed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[serper-bulk] query failed ${index + 1}/${queries.length} ${query.source_id}: ${message}`);
      if (/FATAL_PROVIDER_HTTP_(401|402|403|429)/.test(message)) throw error;
    }
  }

  const sourceOutput = Object.fromEntries(
    [...bySource.entries()].map(([source, metrics]) => [source, metrics]),
  );

  console.log(JSON.stringify({
    run_id: runId,
    mode: "bulk_apply",
    planned_queries: queries.length,
    calls: {
      succeeded: callsSucceeded,
      failed: callsFailed,
      skipped_resume: callsSkippedResume,
    },
    results: {
      raw: rawTotal,
      observations: observationsTotal,
      unique_canonical_urls_this_run: seenThisRun.size,
      new_unique_after_known_db_dedupe: [...bySource.values()].reduce((sum, metrics) => sum + metrics.new_unique, 0),
      discovery_rows_written: discoveryRowsWritten,
      gateway_new_seeds: gatewayNewSeeds,
      gateway_refreshed_seeds: gatewayRefreshedSeeds,
    },
    by_source: sourceOutput,
  }, null, 2));
}

main().catch((error) => {
  console.error("[serper-bulk] fatal", error);
  process.exitCode = 1;
});

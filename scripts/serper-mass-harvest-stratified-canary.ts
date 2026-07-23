import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { normalizeHarvestResults } from "@/lib/serper-mass-harvest/core";
import { buildStratifiedCanaryQueries, STRATIFIED_CANARY_BUDGET } from "@/lib/serper-mass-harvest/stratified-canary";
import type { HarvestQuery, HarvestRawResult, HarvestSourceId } from "@/lib/serper-mass-harvest/types";

const RESULTS_PER_QUERY = 10;
const PROVIDER_TIMEOUT_MS = 12_000;
const READ_PAGE_SIZE = 1000;

type SourceMetrics = {
  calls: number;
  raw: number;
  observations: number;
  accepted: number;
  rejected: number;
  unclassified: number;
  duplicates_or_known: number;
  new_unique: number;
  unique_canonical_urls: Set<string>;
};

function createSourceMetrics(): SourceMetrics {
  return {
    calls: 0,
    raw: 0,
    observations: 0,
    accepted: 0,
    rejected: 0,
    unclassified: 0,
    duplicates_or_known: 0,
    new_unique: 0,
    unique_canonical_urls: new Set<string>(),
  };
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
          "User-Agent": "AkarFinder Serper Stratified Canary",
        },
        body: JSON.stringify({ q: input.query, num: RESULTS_PER_QUERY, gl: "ma", hl: "fr" }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      })
    : await fetch(`${input.endpoint}?q=${encodeURIComponent(input.query)}&num=${RESULTS_PER_QUERY}`, {
        method: "GET",
        headers: {
          "X-API-KEY": input.apiKey,
          "User-Agent": "AkarFinder Serper Stratified Canary",
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

  if ([401, 402, 403, 429].includes(response.status)) {
    throw new Error(`Serper provider stopped with HTTP ${response.status}`);
  }
  if (!response.ok) throw new Error(`Serper provider HTTP ${response.status}`);

  const data = (await response.json()) as { organic?: HarvestRawResult[]; results?: HarvestRawResult[] };
  return (data.organic ?? data.results ?? []).slice(0, RESULTS_PER_QUERY);
}

function sourceKey(query: HarvestQuery): HarvestSourceId {
  return query.source_id;
}

async function main(): Promise<void> {
  if (process.env.SERPER_MASS_HARVEST_ENABLED !== "true") {
    throw new Error("SERPER_MASS_HARVEST_ENABLED must be exactly 'true'");
  }

  const apiKey = process.env.SERPER_MASS_HARVEST_API_KEY ?? process.env.SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing SERPER_MASS_HARVEST_API_KEY or SEARCH_API_KEY");
  const endpoint = process.env.SERPER_MASS_HARVEST_ENDPOINT ?? process.env.SEARCH_API_ENDPOINT ?? "https://google.serper.dev/search";

  const queries = buildStratifiedCanaryQueries();
  if (queries.length !== STRATIFIED_CANARY_BUDGET) {
    throw new Error(`Expected exactly ${STRATIFIED_CANARY_BUDGET} canary queries`);
  }

  const knownBeforeRun = await readKnownCanonicalUrls();
  const seenThisRun = new Set<string>();
  const bySource = new Map<HarvestSourceId, SourceMetrics>();
  const queryMetrics: Array<Record<string, unknown>> = [];
  let callsSucceeded = 0;
  let callsFailed = 0;
  let rawTotal = 0;
  let observationTotal = 0;

  for (const query of queries) {
    const source = sourceKey(query);
    const metrics = bySource.get(source) ?? createSourceMetrics();
    bySource.set(source, metrics);
    metrics.calls += 1;

    try {
      const raw = await fetchSerperResults({ endpoint, apiKey, query: query.query });
      callsSucceeded += 1;
      rawTotal += raw.length;
      metrics.raw += raw.length;

      const observations = normalizeHarvestResults(query, raw);
      observationTotal += observations.length;
      metrics.observations += observations.length;

      let queryNewUnique = 0;
      let queryKnownOrDuplicate = Math.max(0, raw.length - observations.length);
      let queryAccepted = 0;
      let queryRejected = 0;
      let queryUnclassified = 0;

      for (const observation of observations) {
        metrics.unique_canonical_urls.add(observation.canonical_url);
        const alreadyKnown = knownBeforeRun.has(observation.canonical_url) || seenThisRun.has(observation.canonical_url);
        if (alreadyKnown) {
          queryKnownOrDuplicate += 1;
          metrics.duplicates_or_known += 1;
        } else {
          queryNewUnique += 1;
          metrics.new_unique += 1;
        }
        seenThisRun.add(observation.canonical_url);

        if (observation.discovery_status === "accepted") {
          queryAccepted += 1;
          metrics.accepted += 1;
        } else if (observation.discovery_status === "rejected") {
          queryRejected += 1;
          metrics.rejected += 1;
        } else {
          queryUnclassified += 1;
          metrics.unclassified += 1;
        }
      }

      metrics.duplicates_or_known += Math.max(0, raw.length - observations.length);
      queryMetrics.push({
        source,
        query: query.query,
        city: query.city ?? null,
        property_type: query.property_type ?? null,
        intent: query.intent ?? null,
        raw: raw.length,
        observations: observations.length,
        accepted: queryAccepted,
        rejected: queryRejected,
        unclassified: queryUnclassified,
        new_unique: queryNewUnique,
        duplicates_or_known: queryKnownOrDuplicate,
      });
    } catch (error) {
      callsFailed += 1;
      queryMetrics.push({
        source,
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error && /HTTP (401|402|403|429)/.test(error.message)) throw error;
    }
  }

  const sourceOutput = Object.fromEntries(
    [...bySource.entries()].map(([source, metrics]) => [
      source,
      {
        calls: metrics.calls,
        raw: metrics.raw,
        observations: metrics.observations,
        unique_canonical_urls: metrics.unique_canonical_urls.size,
        accepted: metrics.accepted,
        rejected: metrics.rejected,
        unclassified: metrics.unclassified,
        new_unique: metrics.new_unique,
        duplicates_or_known: metrics.duplicates_or_known,
        unique_per_call: Number((metrics.unique_canonical_urls.size / Math.max(metrics.calls, 1)).toFixed(3)),
        new_unique_per_call: Number((metrics.new_unique / Math.max(metrics.calls, 1)).toFixed(3)),
        accepted_per_call: Number((metrics.accepted / Math.max(metrics.calls, 1)).toFixed(3)),
      },
    ]),
  );

  console.log(JSON.stringify({
    mode: "run",
    canary: "stratified",
    hard_cap: STRATIFIED_CANARY_BUDGET,
    calls: {
      reserved: queries.length,
      succeeded: callsSucceeded,
      failed: callsFailed,
    },
    results: {
      raw: rawTotal,
      observations: observationTotal,
      unique_canonical_urls: seenThisRun.size,
      new_unique_after_known_db_dedupe: [...bySource.values()].reduce((sum, metrics) => sum + metrics.new_unique, 0),
      persisted: 0,
    },
    by_source: sourceOutput,
    query_metrics: queryMetrics,
  }, null, 2));
}

main().catch((error) => {
  console.error("[serper-stratified-canary] fatal", error);
  process.exitCode = 1;
});

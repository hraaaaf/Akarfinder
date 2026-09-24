#!/usr/bin/env tsx
// AkarFinder DB Recovery — Serper shadow harvest.
// Search API observations -> JSONL artifact only. ZERO DB access/write.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildBulkHarvestQueries } from "@/lib/serper-mass-harvest/bulk-plan";
import { normalizeHarvestResults } from "@/lib/serper-mass-harvest/core";
import type { HarvestRawResult } from "@/lib/serper-mass-harvest/types";

const RESULTS_PER_QUERY = 10;
const PROVIDER_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_QUERIES = 100;

function boundedMaxQueries(raw: string | undefined): number {
  const value = Number(raw ?? DEFAULT_MAX_QUERIES);
  if (!Number.isInteger(value) || value < 1 || value > 1900) {
    throw new Error("SERPER_SHADOW_MAX_QUERIES must be an integer between 1 and 1900");
  }
  return value;
}

async function fetchSerper(input: {
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
          "User-Agent": "AkarFinder Recovery Serper Shadow",
        },
        body: JSON.stringify({ q: input.query, num: RESULTS_PER_QUERY, gl: "ma", hl: "fr" }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      })
    : await fetch(`${input.endpoint}?q=${encodeURIComponent(input.query)}&num=${RESULTS_PER_QUERY}`, {
        method: "GET",
        headers: {
          "X-API-KEY": input.apiKey,
          "User-Agent": "AkarFinder Recovery Serper Shadow",
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

  if ([401, 402, 403, 429].includes(response.status)) {
    throw new Error(`FATAL_PROVIDER_HTTP_${response.status}`);
  }
  if (!response.ok) throw new Error(`provider HTTP ${response.status}`);
  const data = await response.json() as { organic?: HarvestRawResult[]; results?: HarvestRawResult[] };
  return (data.organic ?? data.results ?? []).slice(0, RESULTS_PER_QUERY);
}

async function main() {
  const apiKey = process.env.SERPER_MASS_HARVEST_API_KEY ?? process.env.SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing SEARCH_API_KEY / SERPER_MASS_HARVEST_API_KEY");
  const endpoint = process.env.SERPER_MASS_HARVEST_ENDPOINT
    ?? process.env.SEARCH_API_ENDPOINT
    ?? "https://google.serper.dev/search";
  const maxQueries = boundedMaxQueries(process.env.SERPER_SHADOW_MAX_QUERIES);

  const observedAt = new Date().toISOString();
  const queries = buildBulkHarvestQueries().slice(0, maxQueries);
  const byUrl = new Map<string, Record<string, unknown>>();
  const perQuery: Array<Record<string, unknown>> = [];
  let rawResults = 0;
  let callsSucceeded = 0;
  let callsFailed = 0;

  for (const [index, query] of queries.entries()) {
    try {
      const raw = await fetchSerper({ endpoint, apiKey, query: query.query });
      rawResults += raw.length;
      callsSucceeded += 1;
      const observations = normalizeHarvestResults(query, raw);

      for (const obs of observations) {
        const existing = byUrl.get(obs.canonical_url);
        const evidence = {
          query_id: query.id,
          query: query.query,
          result_rank: obs.result_rank,
          observed_title: obs.title,
          observed_snippet: obs.snippet,
          discovery_status: obs.discovery_status,
          eligibility_reasons: obs.eligibility_reasons,
          observed_at: observedAt,
        };

        if (existing) {
          const arr = Array.isArray(existing.search_evidence) ? existing.search_evidence as unknown[] : [];
          arr.push(evidence);
          existing.search_evidence = arr;
        } else {
          byUrl.set(obs.canonical_url, {
            canonical_url: obs.canonical_url,
            source_domain: obs.source_domain,
            source_url: obs.source_url,
            discovery_status: obs.discovery_status,
            eligibility_reasons: obs.eligibility_reasons,
            title: obs.title,
            snippet: obs.snippet,
            search_evidence: [evidence],
            observed_at: observedAt,
          });
        }
      }

      perQuery.push({
        query_id: query.id,
        source_id: query.source_id,
        raw: raw.length,
        observations: observations.length,
        accepted: observations.filter((o) => o.discovery_status === "accepted").length,
        rejected: observations.filter((o) => o.discovery_status === "rejected").length,
        unclassified: observations.filter((o) => o.discovery_status === "unclassified").length,
      });
    } catch (error) {
      callsFailed += 1;
      const message = error instanceof Error ? error.message : String(error);
      perQuery.push({ query_id: query.id, source_id: query.source_id, error: message });
      if (/FATAL_PROVIDER_HTTP_(401|402|403|429)/.test(message)) throw error;
    }

    if ((index + 1) % 25 === 0 || index + 1 === queries.length) {
      console.error(`[serper-shadow] progress ${index + 1}/${queries.length}`);
    }
  }

  const rows = [...byUrl.values()]
    .sort((a, b) => String(a.canonical_url).localeCompare(String(b.canonical_url)));
  const jsonl = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  const outputDir = join(process.cwd(), "data/audits/raw-results");
  const outputPath = join(outputDir, "recovery-serper-shadow-candidates.jsonl");
  const summaryPath = join(outputDir, "recovery-serper-shadow-summary.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, jsonl, "utf8");

  const summary = {
    mode: "shadow_read_only",
    observed_at: observedAt,
    planned_queries: maxQueries,
    calls_succeeded: callsSucceeded,
    calls_failed: callsFailed,
    raw_results: rawResults,
    unique_canonical_urls: rows.length,
    accepted: rows.filter((r) => r.discovery_status === "accepted").length,
    rejected: rows.filter((r) => r.discovery_status === "rejected").length,
    unclassified: rows.filter((r) => r.discovery_status === "unclassified").length,
    per_query: perQuery,
    artifact_path: outputPath,
    artifact_sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
    database_access: 0,
    database_writes: 0,
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

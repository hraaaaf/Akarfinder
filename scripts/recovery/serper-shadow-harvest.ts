#!/usr/bin/env tsx
// AkarFinder DB Recovery — Serper shadow harvest.
// Search API observations -> JSONL artifact only. ZERO DB access/write.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildRecoverySerperQueries } from "./recovery-serper-plan";
import { normalizeHarvestResults } from "@/lib/serper-mass-harvest/core";
import type { HarvestRawResult } from "@/lib/serper-mass-harvest/types";

const PROVIDER_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_QUERIES = 100;
const DEFAULT_RESULTS_PER_PAGE = 100;
const DEFAULT_PAGES_PER_QUERY = 1;

function boundedInt(raw:string|undefined, fallback:number, min:number, max:number, name:string):number {
  const value=Number(raw ?? fallback);
  if(!Number.isInteger(value) || value<min || value>max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function boundedMaxQueries(raw:string|undefined):number {
  return boundedInt(raw,DEFAULT_MAX_QUERIES,1,1900,"SERPER_SHADOW_MAX_QUERIES");
}

async function fetchSerper(input: {
  endpoint: string;
  apiKey: string;
  query: string;
  page: number;
  num: number;
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
        body: JSON.stringify({ q: input.query, num: input.num, page: input.page, gl: "ma", hl: "fr" }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      })
    : await fetch(`${input.endpoint}?q=${encodeURIComponent(input.query)}&num=${input.num}&page=${input.page}`, {
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
  return (data.organic ?? data.results ?? []).slice(0, input.num);
}

async function main() {
  const apiKey = process.env.SERPER_MASS_HARVEST_API_KEY ?? process.env.SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing SEARCH_API_KEY / SERPER_MASS_HARVEST_API_KEY");
  const endpoint = process.env.SERPER_MASS_HARVEST_ENDPOINT
    ?? process.env.SEARCH_API_ENDPOINT
    ?? "https://google.serper.dev/search";
  const maxQueries = boundedMaxQueries(process.env.SERPER_SHADOW_MAX_QUERIES);
  const resultsPerPage = boundedInt(process.env.SERPER_SHADOW_RESULTS_PER_PAGE,DEFAULT_RESULTS_PER_PAGE,10,100,"SERPER_SHADOW_RESULTS_PER_PAGE");
  const pagesPerQuery = boundedInt(process.env.SERPER_SHADOW_PAGES_PER_QUERY,DEFAULT_PAGES_PER_QUERY,1,5,"SERPER_SHADOW_PAGES_PER_QUERY");

  const observedAt = new Date().toISOString();
  const queries = buildRecoverySerperQueries().slice(0, maxQueries);
  const byUrl = new Map<string, Record<string, unknown>>();
  const perQuery: Array<Record<string, unknown>> = [];
  let rawResults = 0;
  let callsSucceeded = 0;
  let callsFailed = 0;

  for (const [index, query] of queries.entries()) {
    try {
      const raw: HarvestRawResult[] = [];
      for (let page = 1; page <= pagesPerQuery; page += 1) {
        const pageRows = await fetchSerper({ endpoint, apiKey, query: query.query, page, num: resultsPerPage });
        raw.push(...pageRows);
        callsSucceeded += 1;
        if (pageRows.length < resultsPerPage) break;
      }
      rawResults += raw.length;
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
    results_per_page: resultsPerPage,
    pages_per_query: pagesPerQuery,
    theoretical_max_api_calls: maxQueries * pagesPerQuery,
    theoretical_max_result_slots: maxQueries * pagesPerQuery * resultsPerPage,
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

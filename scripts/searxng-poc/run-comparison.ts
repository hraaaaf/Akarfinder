#!/usr/bin/env tsx
// SEARXNG-VS-OPENSERP-DISCOVERY-POC-1
// Isolated measurement script: for each of the 100 benchmark queries, calls
// SearXNG (one request, server-side fan-out to every candidate engine) and
// OpenSERP (native transport, same production contract, no orchestrator/
// budget-policy/DB involved at all), then applies the EXISTING, UNMODIFIED
// AkarFinder admission pipeline (decideAdmission -- domain allowlist,
// real-estate relevance, category-page rejection, canonicalization, PII
// redaction) offline to every raw result from both sources.
//
// Never fetches a listing page. Never persists anything to any database.
// Never touches openserp_query_rotation_state, openserp_engine_budget_state,
// or any business table. Only url/title/snippet/engine/rank are ever read
// from either source; title/snippet only ever appear in this report AFTER
// going through decideAdmission's own PII redaction (classified.title /
// classified.snippet), exactly like the existing production pipeline's own
// rawResultsLog in run-orchestrator.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenSerpNativeClient } from "@/lib/openserp-async/openserp-native-client";
import { OpenSerpHttpError } from "@/lib/openserp-async/openserp-client";
import { decideAdmission, type AdmissionDecision } from "@/lib/openserp-ingestion/national-admission";
import { classifyEngineErrorDetail, type EngineErrorCategory } from "@/lib/openserp-ingestion/engine-error-diagnostics";
import type { OpenSerpIngestionQuery } from "@/lib/openserp-ingestion/types";
import type { OpenSerpRawResult } from "@/lib/openserp-async/types";

const OPENSERP_URL = (process.env.OPENSERP_LOCAL_URL ?? "http://127.0.0.1:7070").replace(/\/+$/, "");
const SEARXNG_URL = (process.env.SEARXNG_URL ?? "http://127.0.0.1:8888").replace(/\/+$/, "");
const SEARXNG_ENGINES = ["google", "duckduckgo", "brave", "startpage", "mojeek", "yandex", "qwant"];
const REQUEST_TIMEOUT_MS = 15_000;

type BenchmarkQuery = {
  query_id: string;
  city: string;
  district: string | null;
  transaction: "sale" | "rent";
  property_type: string;
  priority_tier: 1 | 2 | 3 | 4;
  query_text: string;
  target_domain: string | null;
  query_family: "general" | "brand_hint";
};

type RawRecord = { engine: string; url: string; title: string; snippet: string | null; rank: number };

type EngineAttemptResult = {
  records: RawRecord[];
  durationMs: number;
  errors: Array<{ engine: string; category: EngineErrorCategory | "searxng_unresponsive"; message: string }>;
};

function toIngestionQuery(q: BenchmarkQuery): OpenSerpIngestionQuery {
  return {
    query_id: q.query_id,
    city: q.city,
    district: q.district ?? "",
    transaction_type: q.transaction,
    property_type: q.property_type,
    query_text: q.query_text,
    priority: q.priority_tier <= 1 ? "high" : q.priority_tier === 2 ? "medium" : "low",
    target_domain: q.target_domain ?? undefined,
    query_family: q.query_family,
  };
}

function classifySearxngErrorMessage(message: string): EngineErrorCategory | "searxng_unresponsive" {
  const lower = message.toLowerCase();
  if (lower.includes("captcha")) return "captcha";
  if (lower.includes("403")) return "http_403";
  if (lower.includes("429")) return "http_429";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  return "searxng_unresponsive";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

let searxngDiagnosticDumped = false;

async function fetchSearxng(query: BenchmarkQuery): Promise<EngineAttemptResult> {
  const started = Date.now();
  const params = new URLSearchParams();
  params.set("q", query.query_text);
  params.set("format", "json");
  params.set("categories", "general");
  params.set("engines", SEARXNG_ENGINES.join(","));

  try {
    const response = await fetchWithTimeout(`${SEARXNG_URL}/search?${params.toString()}`, REQUEST_TIMEOUT_MS);
    const bodyText = await response.text();

    if (!searxngDiagnosticDumped) {
      searxngDiagnosticDumped = true;
      console.log(`[searxng-schema-diagnostic] status=${response.status} body_first_1500_chars=${bodyText.slice(0, 1500)}`);
    }

    if (!response.ok) {
      // A whole-request failure means none of the configured engines could
      // be measured for this query -- attribute it to every one of them,
      // not a single dropped synthetic tag, so the per-engine error counts
      // stay accurate.
      const category = response.status === 429 ? "http_429" : response.status === 403 ? "http_403" : "unknown";
      return {
        records: [],
        durationMs: Date.now() - started,
        errors: SEARXNG_ENGINES.map((engine) => ({ engine, category, message: `searxng http ${response.status}` })),
      };
    }

    const json = JSON.parse(bodyText) as {
      results?: Array<{ url?: string; title?: string; content?: string; snippet?: string; engine?: string; engines?: string[]; positions?: Record<string, number> }>;
      unresponsive_engines?: Array<[string, string]>;
    };

    const records: RawRecord[] = [];
    for (const [index, r] of (json.results ?? []).entries()) {
      const url = r.url;
      if (!url) continue;
      const title = r.title ?? "";
      const snippet = r.content ?? r.snippet ?? null;
      const engines = r.engines && r.engines.length > 0 ? r.engines : r.engine ? [r.engine] : ["unknown"];
      for (const engine of engines) {
        const rank = r.positions?.[engine] ?? index + 1;
        records.push({ engine, url, title, snippet, rank });
      }
    }

    const errors = (json.unresponsive_engines ?? []).map(([engine, message]) => ({
      engine,
      category: classifySearxngErrorMessage(message ?? ""),
      message: String(message ?? "").slice(0, 200),
    }));

    return { records, durationMs: Date.now() - started, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const category = error instanceof Error && error.name === "AbortError" ? "timeout" : "unknown";
    return {
      records: [],
      durationMs: Date.now() - started,
      errors: SEARXNG_ENGINES.map((engine) => ({ engine, category, message })),
    };
  }
}

async function fetchOpenserp(query: BenchmarkQuery): Promise<EngineAttemptResult> {
  const started = Date.now();
  const client = createOpenSerpNativeClient({ baseUrl: OPENSERP_URL, timeoutMs: REQUEST_TIMEOUT_MS });
  // duckduckgo only: every real GitHub-native run this mission has observed
  // (2026-07-19 dry-runs and both real cron runs) shows bing 429'd and
  // ecosia 403'd on every attempt in this exact runtime -- attempting them
  // here would only pay their timeout cost for zero informational value.
  // This measures OpenSERP's actual current delivered capability, not a
  // hypothetical fully-functional 3-engine baseline. No suspension/backoff
  // state involved -- this script never reads or writes
  // openserp_engine_budget_state.
  const attemptEngines: Array<"bing" | "duckduckgo" | "ecosia"> = ["duckduckgo"];
  const errors: EngineAttemptResult["errors"] = [];

  for (const engine of attemptEngines) {
    try {
      const response = await client.search({ engine, query: query.query_text, limit: 15, locale: "fr-MA" });
      const records: RawRecord[] = response.results.map((r, index) => ({
        engine,
        url: r.url ?? "",
        title: r.title ?? "",
        snippet: r.snippet ?? null,
        rank: r.position?.absolute ?? r.rank ?? index + 1,
      })).filter((r) => r.url);
      return { records, durationMs: Date.now() - started, errors };
    } catch (error) {
      const httpStatus = error instanceof OpenSerpHttpError ? error.status : null;
      const message = error instanceof Error ? error.message : String(error);
      const category = classifyEngineErrorDetail({
        outcome: null,
        errorName: error instanceof Error ? error.name : null,
        errorCode: null,
        httpStatus,
        message,
      });
      errors.push({ engine, category, message: message.slice(0, 200) });
    }
  }

  return { records: [], durationMs: Date.now() - started, errors };
}

type EngineMetrics = {
  raw_results: number;
  accepted_real_estate_urls: number;
  admitted_canonical_urls: Set<string>;
  rejected: number;
  top_domains: Map<string, number>;
  cities_covered: Set<string>;
  errors: Record<string, number>;
  total_duration_ms: number;
  query_count: number;
};

function newEngineMetrics(): EngineMetrics {
  return {
    raw_results: 0,
    accepted_real_estate_urls: 0,
    admitted_canonical_urls: new Set(),
    rejected: 0,
    top_domains: new Map(),
    cities_covered: new Set(),
    errors: {},
    total_duration_ms: 0,
    query_count: 0,
  };
}

function recordError(metrics: EngineMetrics, category: string) {
  metrics.errors[category] = (metrics.errors[category] ?? 0) + 1;
}

async function main() {
  const benchmarkPath = join(process.cwd(), "scripts/searxng-poc/benchmark-100-queries.json");
  const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8")) as { queries: BenchmarkQuery[] };

  const openserpMetrics = newEngineMetrics();
  const searxngMetricsByEngine = new Map<string, EngineMetrics>(SEARXNG_ENGINES.map((e) => [e, newEngineMetrics()]));

  const runStarted = Date.now();

  for (let i = 0; i < benchmark.queries.length; i += 1) {
    const query = benchmark.queries[i];
    console.log(`[progress] ${i + 1}/${benchmark.queries.length} query_id=${query.query_id} city=${query.city} text="${query.query_text}"`);

    const [openserpResult, searxngResult] = await Promise.all([fetchOpenserp(query), fetchSearxng(query)]);

    openserpMetrics.query_count += 1;
    openserpMetrics.total_duration_ms += openserpResult.durationMs;
    openserpMetrics.raw_results += openserpResult.records.length;
    openserpMetrics.cities_covered.add(query.city);
    for (const err of openserpResult.errors) recordError(openserpMetrics, err.category);
    for (const rec of openserpResult.records) {
      const decision = decideAdmission({
        result: { title: rec.title, url: rec.url, snippet: rec.snippet ?? undefined, rank: rec.rank, engine: rec.engine } as OpenSerpRawResult,
        query: toIngestionQuery(query),
        engine: "duckduckgo",
        discovered_at: new Date().toISOString(),
        fallbackRank: rec.rank,
      });
      if (decision.admitted && decision.classified) {
        openserpMetrics.accepted_real_estate_urls += 1;
        openserpMetrics.admitted_canonical_urls.add(decision.classified.canonical_source_url);
        openserpMetrics.top_domains.set(decision.classified.source_domain, (openserpMetrics.top_domains.get(decision.classified.source_domain) ?? 0) + 1);
      } else {
        openserpMetrics.rejected += 1;
      }
    }

    for (const err of searxngResult.errors) {
      const m = searxngMetricsByEngine.get(err.engine);
      if (m) recordError(m, err.category);
    }
    const recordsByEngine = new Map<string, RawRecord[]>();
    for (const rec of searxngResult.records) {
      if (!recordsByEngine.has(rec.engine)) recordsByEngine.set(rec.engine, []);
      recordsByEngine.get(rec.engine)!.push(rec);
    }
    for (const engine of SEARXNG_ENGINES) {
      const m = searxngMetricsByEngine.get(engine)!;
      m.query_count += 1;
      m.total_duration_ms += searxngResult.durationMs; // single shared request across engines
      m.cities_covered.add(query.city);
      const records = recordsByEngine.get(engine) ?? [];
      m.raw_results += records.length;
      for (const rec of records) {
        const decision: AdmissionDecision = decideAdmission({
          result: { title: rec.title, url: rec.url, snippet: rec.snippet ?? undefined, rank: rec.rank, engine: rec.engine } as OpenSerpRawResult,
          query: toIngestionQuery(query),
          engine: "duckduckgo",
          discovered_at: new Date().toISOString(),
          fallbackRank: rec.rank,
        });
        if (decision.admitted && decision.classified) {
          m.accepted_real_estate_urls += 1;
          m.admitted_canonical_urls.add(decision.classified.canonical_source_url);
          m.top_domains.set(decision.classified.source_domain, (m.top_domains.get(decision.classified.source_domain) ?? 0) + 1);
        } else {
          m.rejected += 1;
        }
      }
    }
  }

  const totalDurationMs = Date.now() - runStarted;

  function summarize(name: string, m: EngineMetrics, baseline: Set<string> | null) {
    const uniqueUrls = m.admitted_canonical_urls.size;
    const incremental = baseline ? [...m.admitted_canonical_urls].filter((u) => !baseline.has(u)).length : null;
    const overlap = baseline && uniqueUrls > 0 ? [...m.admitted_canonical_urls].filter((u) => baseline.has(u)).length / uniqueUrls : baseline ? 0 : null;
    return {
      engine: name,
      raw_results: m.raw_results,
      accepted_real_estate_urls: m.accepted_real_estate_urls,
      unique_urls: uniqueUrls,
      incremental_unique_vs_openserp: incremental,
      overlap_rate_with_openserp: overlap !== null ? Math.round(overlap * 1000) / 1000 : null,
      rejection_rate: m.raw_results > 0 ? Math.round((m.rejected / m.raw_results) * 1000) / 1000 : 0,
      top_domains: [...m.top_domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      cities_covered: m.cities_covered.size,
      errors: m.errors,
      avg_duration_ms: m.query_count > 0 ? Math.round(m.total_duration_ms / m.query_count) : 0,
    };
  }

  const openserpBaselineUrls = openserpMetrics.admitted_canonical_urls;
  const report = {
    benchmark_size: benchmark.queries.length,
    total_run_duration_ms: totalDurationMs,
    openserp_baseline: summarize("openserp", openserpMetrics, null),
    searxng_engines: SEARXNG_ENGINES.map((e) => summarize(e, searxngMetricsByEngine.get(e)!, openserpBaselineUrls)),
  };

  console.log("\n=== FINAL REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  writeFileSync(join(process.cwd(), "scripts/searxng-poc/comparison-report.json"), JSON.stringify(report, null, 2), "utf8");
}

main().catch((error) => {
  console.error("Fatal:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

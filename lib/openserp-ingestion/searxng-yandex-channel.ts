// OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1
// Second, additive discovery channel: Yandex via a local SearXNG instance.
// Deliberately isolated from openserp-live.ts and budget-policy.ts --
// Yandex is a discovery channel, not an OpenSERP engine. It never touches
// openserp_engine_budget_state, never influences bing/duckduckgo/ecosia
// suspension, cooldown, or last_success_at, and has its own separate
// metrics tracked entirely in-memory for a single run (see
// YandexChannelMetrics below), surfaced additively on RunMetrics.
//
// Proven HTTP contract (same shape already validated by the standalone
// SearXNG-vs-OpenSERP POC: SEARXNG-VS-OPENSERP-DISCOVERY-POC-1 and
// SEARXNG-YANDEX-SHADOW-LANE-1, both of which ran 100/100 real queries
// against a real ephemeral SearXNG container with 0 errors on the yandex
// engine specifically): GET {searxngUrl}/search?q=...&format=json&
// categories=general&engines=yandex. Only ever requests the yandex engine
// -- never duckduckgo/brave/startpage/mojeek/qwant/google.
//
// Fail-safe by construction: this function never throws. Any failure
// (network error, non-200, malformed body, timeout) is caught, classified
// into YandexChannelMetrics, and an empty result array is returned --
// OpenSERP's own results for the same query are never affected.
//
// No page fetch, no image, no raw HTML persisted anywhere -- only
// url/title/snippet/rank are ever read from the SearXNG response.

import { classifyEngineErrorDetail, type EngineErrorCategory } from "./engine-error-diagnostics";

export const DEFAULT_SEARXNG_URL = "http://127.0.0.1:8888";
export const DEFAULT_SEARXNG_TIMEOUT_MS = 15_000;
export const SOURCE_CHANNEL_SEARXNG_YANDEX = "searxng_yandex" as const;

export type YandexRawResult = {
  url: string;
  title: string;
  snippet: string | null;
  rank: number;
};

export type YandexChannelMetrics = {
  attempts: number;
  successes: number;
  failures: number;
  raw_results: number;
  captcha_count: number;
  status_403_429: number;
  timeout_count: number;
  other_error_count: number;
  total_duration_ms: number;
  error_category_breakdown: Partial<Record<EngineErrorCategory, number>>;
};

export function newYandexChannelMetrics(): YandexChannelMetrics {
  return {
    attempts: 0,
    successes: 0,
    failures: 0,
    raw_results: 0,
    captcha_count: 0,
    status_403_429: 0,
    timeout_count: 0,
    other_error_count: 0,
    total_duration_ms: 0,
    error_category_breakdown: {},
  };
}

function recordFailure(metrics: YandexChannelMetrics, category: EngineErrorCategory) {
  metrics.failures += 1;
  metrics.error_category_breakdown[category] = (metrics.error_category_breakdown[category] ?? 0) + 1;
  if (category === "captcha") metrics.captcha_count += 1;
  else if (category === "http_403" || category === "http_429") metrics.status_403_429 += 1;
  else if (category === "timeout") metrics.timeout_count += 1;
  else metrics.other_error_count += 1;
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

// Mirrors the already-proven classification used by the shadow-benchmark
// script's own classifySearxngErrorMessage, expressed through the shared
// EngineErrorCategory type instead of a bespoke local union, so Yandex
// failures are reported in the same vocabulary as OpenSERP's own
// engine_error_category_breakdown.
function classifySearxngFailure(input: { httpStatus?: number | null; message: string }): EngineErrorCategory {
  return classifyEngineErrorDetail({
    outcome: null,
    errorName: null,
    errorCode: null,
    httpStatus: input.httpStatus ?? null,
    message: input.message,
  });
}

export async function fetchYandexViaSearxng(input: {
  queryText: string;
  searxngUrl?: string;
  timeoutMs?: number;
  metrics: YandexChannelMetrics;
}): Promise<YandexRawResult[]> {
  const searxngUrl = (input.searxngUrl ?? DEFAULT_SEARXNG_URL).replace(/\/+$/, "");
  const timeoutMs = input.timeoutMs ?? DEFAULT_SEARXNG_TIMEOUT_MS;
  const startedAt = Date.now();
  input.metrics.attempts += 1;

  try {
    const params = new URLSearchParams();
    params.set("q", input.queryText);
    params.set("format", "json");
    params.set("categories", "general");
    params.set("engines", "yandex"); // only engine this module ever requests

    const response = await fetchWithTimeout(`${searxngUrl}/search?${params.toString()}`, timeoutMs);
    const bodyText = await response.text();
    input.metrics.total_duration_ms += Date.now() - startedAt;

    if (!response.ok) {
      recordFailure(input.metrics, classifySearxngFailure({ httpStatus: response.status, message: `searxng http ${response.status}` }));
      return [];
    }

    const json = JSON.parse(bodyText) as {
      results?: Array<{ url?: string; title?: string; content?: string; snippet?: string; engine?: string; engines?: string[]; positions?: Record<string, number> }>;
      unresponsive_engines?: Array<[string, string]>;
    };

    // If SearXNG itself reports yandex as unresponsive for this query,
    // treat it as a failure (captcha/timeout/etc, whatever it reports),
    // not a silent empty success.
    const yandexUnresponsive = (json.unresponsive_engines ?? []).find(([engine]) => engine === "yandex");
    if (yandexUnresponsive) {
      recordFailure(input.metrics, classifySearxngFailure({ httpStatus: null, message: String(yandexUnresponsive[1] ?? "") }));
      return [];
    }

    const results: YandexRawResult[] = [];
    for (const [index, r] of (json.results ?? []).entries()) {
      const url = r.url;
      if (!url) continue;
      const engines = r.engines && r.engines.length > 0 ? r.engines : r.engine ? [r.engine] : [];
      if (!engines.includes("yandex")) continue; // defense in depth: never accept a non-yandex-tagged record
      const rank = r.positions?.yandex ?? index + 1;
      results.push({ url, title: r.title ?? "", snippet: r.content ?? r.snippet ?? null, rank });
    }

    input.metrics.successes += 1;
    input.metrics.raw_results += results.length;
    return results;
  } catch (error) {
    input.metrics.total_duration_ms += Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    const isAbort = error instanceof Error && error.name === "AbortError";
    recordFailure(input.metrics, isAbort ? "timeout" : classifySearxngFailure({ httpStatus: null, message }));
    return [];
  }
}

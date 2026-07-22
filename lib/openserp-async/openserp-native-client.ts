// OPENSERP-GITHUB-NATIVE-TRANSPORT-1
// CASABLANCA-MASS-ACQUISITION-V1 — the GitHub-native scale lane may request
// a deeper organic result set than the historical 15-result orchestrator
// default via OPENSERP_NATIVE_RESULT_LIMIT. This override is transport-local:
// Vercel/adapter behavior is unchanged. karust/openserp's native API supports
// limit values up to 100; we clamp there and keep the old request.limit when
// the override is absent/invalid.
// Alternate transport for the OpenSERP async feeder: talks directly to the
// real karust/openserp HTTP contract (GET /{engine}/search?text=...) instead
// of the Railway-adapter contract openserp-client.ts speaks (POST /search
// with a translated JSON body). Selected explicitly via OPENSERP_TRANSPORT=
// "native" in lib/openserp-ingestion/openserp-live.ts -- the existing
// adapter client and its default selection are untouched.
//
// Same safety gate as the adapter client (assertOpenSerpEngineAllowed):
// this is a new transport, not a new bypass.

import { assertOpenSerpEngineAllowed, normalizeAllowedOpenSerpEngines } from "./openserp-policy";
import { OpenSerpHttpError } from "./openserp-client";
import type { OpenSerpEngine, OpenSerpRawResult, OpenSerpSearchRequest, OpenSerpSearchResponse } from "./types";

type OpenSerpNativeClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

// karust/openserp's real path segments differ from our engine names in
// exactly one case: duckduckgo -> "duck". google is never dispatched here
// (assertOpenSerpEngineAllowed rejects it before this map is consulted).
const NATIVE_ENGINE_PATH: Record<Exclude<OpenSerpEngine, "google">, string> = {
  bing: "bing",
  ecosia: "ecosia",
  duckduckgo: "duck",
};

function toBaseUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/+$/, "");
}

function splitLocale(locale?: string): { lang?: string; region?: string } {
  if (typeof locale !== "string" || !locale.trim()) return {};
  const [lang, region] = locale.split("-");
  return { lang: lang || undefined, region: region || undefined };
}

export function resolveNativeResultLimit(requestLimit: number | undefined, env: NodeJS.ProcessEnv): number {
  const rawOverride = env.OPENSERP_NATIVE_RESULT_LIMIT?.trim();
  const parsedOverride = rawOverride ? Number(rawOverride) : Number.NaN;
  const requested = Number.isFinite(parsedOverride) && parsedOverride > 0 ? parsedOverride : (requestLimit ?? 10);
  return Math.min(Math.max(Math.trunc(requested), 1), 100);
}

type OpenSerpNativeResult = {
  id?: string;
  rank?: number;
  type?: string;
  title?: string;
  url?: string;
  display_url?: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
  engine?: string;
  position?: { absolute?: number };
};

type OpenSerpNativeSearchResponse = {
  query?: { text?: string };
  meta?: { requested_at?: string; version?: string };
  results?: OpenSerpNativeResult[];
};

function mapNativeResult(result: OpenSerpNativeResult): OpenSerpRawResult {
  return {
    id: result.id,
    rank: result.rank,
    type: result.type,
    title: result.title,
    url: result.url,
    display_url: result.display_url,
    snippet: result.snippet,
    domain: result.domain,
    favicon: result.favicon,
    engine: result.engine,
    position: result.position,
  };
}

export function createOpenSerpNativeClient(options: OpenSerpNativeClientOptions = {}) {
  const env = options.env ?? process.env;
  const baseUrl = toBaseUrl(options.baseUrl ?? env.OPENSERP_LOCAL_URL);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.max(1000, Math.trunc(options.timeoutMs ?? 20000));
  const allowedEngines = normalizeAllowedOpenSerpEngines(env.OPENSERP_ALLOWED_ENGINES);

  return {
    async search(request: OpenSerpSearchRequest): Promise<OpenSerpSearchResponse> {
      assertOpenSerpEngineAllowed(request.engine, env);

      if (!baseUrl) {
        throw new Error("OPENSERP_LOCAL_URL is required for the native transport");
      }
      if (!fetchImpl) {
        throw new Error("fetch is unavailable");
      }
      if (!allowedEngines.includes(request.engine as Exclude<OpenSerpEngine, "google">)) {
        throw new Error(`OpenSERP engine not allowed: ${request.engine}`);
      }

      const enginePath = NATIVE_ENGINE_PATH[request.engine as Exclude<OpenSerpEngine, "google">];
      const { lang, region } = splitLocale(request.locale);
      const params = new URLSearchParams();
      params.set("text", request.query);
      params.set("limit", String(resolveNativeResultLimit(request.limit, env)));
      if (lang) params.set("lang", lang);
      if (region) params.set("region", region);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/${enginePath}/search?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new OpenSerpHttpError(response.status);
        }

        const json = (await response.json()) as OpenSerpNativeSearchResponse;

        return {
          engine: request.engine as Exclude<OpenSerpEngine, "google">,
          query: json.query?.text ?? request.query,
          results: Array.isArray(json.results) ? json.results.map(mapNativeResult) : [],
          fetched_at: json.meta?.requested_at ?? new Date().toISOString(),
          provider: "openserp_async_poc",
          version: json.meta?.version,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

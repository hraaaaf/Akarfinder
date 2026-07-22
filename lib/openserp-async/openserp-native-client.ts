// OPENSERP-GITHUB-NATIVE-TRANSPORT-1
// MASS-ACQUISITION-CAMPAIGN-V2 — the GitHub-native scale lane may request
// multiple native OpenSERP pages in one bounded client call. The upstream API
// exposes `limit` (max 100), `start`, and pagination.next_start. This remains
// transport-local and opt-in through OPENSERP_NATIVE_MAX_PAGES; every existing
// caller keeps exactly one page when the override is absent.
// Alternate transport for the OpenSERP async feeder: talks directly to the
// real karust/openserp HTTP contract (GET /{engine}/search?text=...) instead
// of the Railway-adapter contract openserp-client.ts speaks.

import { assertOpenSerpEngineAllowed, normalizeAllowedOpenSerpEngines } from "./openserp-policy";
import { OpenSerpHttpError } from "./openserp-client";
import type { OpenSerpEngine, OpenSerpRawResult, OpenSerpSearchRequest, OpenSerpSearchResponse } from "./types";

type OpenSerpNativeClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

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

export function resolveNativeMaxPages(env: NodeJS.ProcessEnv): number {
  const raw = env.OPENSERP_NATIVE_MAX_PAGES?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), 4);
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
  pagination?: {
    page?: number;
    has_more?: boolean;
    next_start?: number;
  };
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

      if (!baseUrl) throw new Error("OPENSERP_LOCAL_URL is required for the native transport");
      if (!fetchImpl) throw new Error("fetch is unavailable");
      if (!allowedEngines.includes(request.engine as Exclude<OpenSerpEngine, "google">)) {
        throw new Error(`OpenSERP engine not allowed: ${request.engine}`);
      }

      const enginePath = NATIVE_ENGINE_PATH[request.engine as Exclude<OpenSerpEngine, "google">];
      const { lang, region } = splitLocale(request.locale);
      const limit = resolveNativeResultLimit(request.limit, env);
      const maxPages = resolveNativeMaxPages(env);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const collected: OpenSerpRawResult[] = [];
        let queryText = request.query;
        let fetchedAt = new Date().toISOString();
        let version: string | undefined;
        let pagination: OpenSerpSearchResponse["pagination"];
        let start = Math.max(0, Math.trunc(request.start ?? 0));

        for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
          const params = new URLSearchParams();
          params.set("text", request.query);
          params.set("limit", String(limit));
          if (start > 0) params.set("start", String(start));
          if (lang) params.set("lang", lang);
          if (region) params.set("region", region);

          const response = await fetchImpl(`${baseUrl}/${enginePath}/search?${params.toString()}`, {
            method: "GET",
            signal: controller.signal,
          });
          if (!response.ok) throw new OpenSerpHttpError(response.status);

          const json = (await response.json()) as OpenSerpNativeSearchResponse;
          queryText = json.query?.text ?? queryText;
          fetchedAt = json.meta?.requested_at ?? fetchedAt;
          version = json.meta?.version ?? version;
          pagination = json.pagination;
          if (Array.isArray(json.results)) collected.push(...json.results.map(mapNativeResult));

          const nextStart = json.pagination?.next_start;
          if (!json.pagination?.has_more || !Number.isFinite(nextStart) || (nextStart as number) <= start) break;
          start = Math.max(0, Math.trunc(nextStart as number));
        }

        const deduped = [...new Map(collected.map((result, index) => [result.url ?? result.link ?? result.id ?? `row-${index}`, result])).values()];
        return {
          engine: request.engine as Exclude<OpenSerpEngine, "google">,
          query: queryText,
          results: deduped,
          fetched_at: fetchedAt,
          provider: "openserp_async_poc",
          version,
          pagination,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

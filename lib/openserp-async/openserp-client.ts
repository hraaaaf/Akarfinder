import { assertOpenSerpEngineAllowed, normalizeAllowedOpenSerpEngines } from "./openserp-policy";
import type { OpenSerpEngine, OpenSerpSearchRequest, OpenSerpSearchResponse } from "./types";

type OpenSerpClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

function toBaseUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/+$/, "");
}

export function createOpenSerpClient(options: OpenSerpClientOptions = {}) {
  const env = options.env ?? process.env;
  const baseUrl = toBaseUrl(options.baseUrl ?? env.OPENSERP_LOCAL_URL);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.max(1000, Math.trunc(options.timeoutMs ?? 20000));
  const allowedEngines = normalizeAllowedOpenSerpEngines(env.OPENSERP_ALLOWED_ENGINES);

  return {
    async search(request: OpenSerpSearchRequest): Promise<OpenSerpSearchResponse> {
      assertOpenSerpEngineAllowed(request.engine, env);

      if (!baseUrl) {
        throw new Error("OPENSERP_LOCAL_URL is required for the async feeder");
      }
      if (!fetchImpl) {
        throw new Error("fetch is unavailable");
      }
      if (!allowedEngines.includes(request.engine as Exclude<OpenSerpEngine, "google">)) {
        throw new Error(`OpenSERP engine not allowed: ${request.engine}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/search`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            engine: request.engine,
            query: request.query,
            limit: Math.min(Math.max(Math.trunc(request.limit ?? 10), 1), 20),
            locale: request.locale ?? "fr-MA",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`OpenSERP local endpoint returned ${response.status}`);
        }

        const json = (await response.json()) as {
          engine?: string;
          query?: string;
          results?: unknown[];
          fetched_at?: string;
          provider?: string;
        };

        return {
          engine: request.engine as Exclude<OpenSerpEngine, "google">,
          query: json.query ?? request.query,
          results: Array.isArray(json.results) ? (json.results as OpenSerpSearchResponse["results"]) : [],
          fetched_at: json.fetched_at ?? new Date().toISOString(),
          provider: "openserp_async_poc",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

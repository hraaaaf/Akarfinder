// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 4.
// Every engine call now has its own bounded timeout (AbortController for
// the HTTP path, execFile's own `timeout` + `signal` for the CLI path) and
// throws a classified EngineCallError rather than a generic Error, so the
// orchestrator's batch loop can tell a slow engine apart from a genuinely
// broken one -- and, critically, so one slow engine can never silently
// consume the whole invocation's time budget the way it did in the
// incident this mission fixes (a 70s hardcoded CLI timeout, times up to
// 2 engines per query, times a 12-query batch, with no budget check
// between iterations).

import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createOpenSerpClient } from "@/lib/openserp-async/openserp-client";
import type { OpenSerpSearchResponse } from "@/lib/openserp-async/types";
import type { OpenSerpProviderInfo } from "./types";

const execFileAsync = promisify(execFile);

// Named default so this is never a magic number scattered across call
// sites -- callers (run-orchestrator.ts) may override per-call based on
// remaining time budget.
export const DEFAULT_ENGINE_CALL_TIMEOUT_MS = 15_000;

export type EngineCallOutcome = "success" | "engine_timeout" | "network_error" | "invalid_response";

export class EngineCallError extends Error {
  readonly outcome: Exclude<EngineCallOutcome, "success">;
  constructor(message: string, outcome: Exclude<EngineCallOutcome, "success">) {
    super(message);
    this.name = "EngineCallError";
    this.outcome = outcome;
  }
}

function resolveOpenSerpBinary(env: NodeJS.ProcessEnv): string {
  return env.OPENSERP_BINARY_PATH?.trim() || "openserp";
}

export async function runOpenSerpLiveQuery(input: {
  engine: "bing" | "ecosia" | "duckduckgo";
  query: string;
  limit: number;
  site?: string;
  start?: number;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<{
  response: OpenSerpSearchResponse;
  provider: OpenSerpProviderInfo;
}> {
  const env = input.env ?? process.env;
  const baseUrl = env.OPENSERP_LOCAL_URL?.trim();
  const timeoutMs = Math.max(1000, Math.trunc(input.timeoutMs ?? DEFAULT_ENGINE_CALL_TIMEOUT_MS));

  if (baseUrl) {
    const client = createOpenSerpClient({ env, baseUrl, timeoutMs });
    let response: OpenSerpSearchResponse;
    try {
      response = await client.search({
        engine: input.engine,
        query: input.query,
        limit: input.limit,
        locale: "fr-MA",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new EngineCallError(`engine ${input.engine} timed out after ${timeoutMs}ms`, "engine_timeout");
      }
      if (error instanceof SyntaxError) {
        throw new EngineCallError(`engine ${input.engine} returned an invalid response: ${error.message}`, "invalid_response");
      }
      throw new EngineCallError(`engine ${input.engine} network error: ${error instanceof Error ? error.message : String(error)}`, "network_error");
    }
    return {
      response,
      provider: {
        provider: "openserp",
        provider_mode: "local_http",
        provider_endpoint: baseUrl,
        provider_live_or_fixture: "live",
        provider_version: response.version,
      },
    };
  }

  const binary = resolveOpenSerpBinary(env);
  let stdout: string;
  try {
    // Node's own `timeout` option kills the child process (SIGTERM) once
    // exceeded -- no separate AbortController needed for a plain
    // execFile call.
    const result = await execFileAsync(
      binary,
      [
        "search",
        input.engine,
        input.query,
        ...(input.site ? ["--site", input.site] : []),
        "--format",
        "json",
        "--limit",
        String(Math.min(Math.max(Math.trunc(input.limit), 1), 20)),
        ...(input.start ? ["--start", String(Math.max(Math.trunc(input.start), 0))] : []),
        "--search-timeout",
        String(Math.max(1, Math.round(timeoutMs / 1000))),
        "--quiet",
      ],
      {
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      },
    );
    stdout = result.stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string | null };
    if (err.killed || err.signal === "SIGTERM" || err.code === "ETIMEDOUT") {
      throw new EngineCallError(`engine ${input.engine} timed out after ${timeoutMs}ms`, "engine_timeout");
    }
    throw new EngineCallError(`engine ${input.engine} process error: ${err.message}`, "network_error");
  }

  let parsed: { query?: { text?: string }; meta?: { requested_at?: string; version?: string }; results?: OpenSerpSearchResponse["results"] };
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new EngineCallError(`engine ${input.engine} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`, "invalid_response");
  }

  return {
    response: {
      engine: input.engine,
      query: parsed.query?.text ?? input.query,
      results: Array.isArray(parsed.results) ? parsed.results : [],
      fetched_at: parsed.meta?.requested_at ?? new Date().toISOString(),
      provider: "openserp_async_poc",
      version: parsed.meta?.version,
    },
    provider: {
      provider: "openserp",
      provider_mode: "local_cli",
      provider_endpoint: binary,
      provider_live_or_fixture: "live",
      provider_version: parsed.meta?.version,
    },
  };
}

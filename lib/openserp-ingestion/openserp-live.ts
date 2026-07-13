import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createOpenSerpClient } from "@/lib/openserp-async/openserp-client";
import type { OpenSerpSearchResponse } from "@/lib/openserp-async/types";
import type { OpenSerpProviderInfo } from "./types";

const execFileAsync = promisify(execFile);

function resolveOpenSerpBinary(env: NodeJS.ProcessEnv): string {
  return env.OPENSERP_BINARY_PATH?.trim() || "openserp";
}

export async function runOpenSerpLiveQuery(input: {
  engine: "bing" | "ecosia";
  query: string;
  limit: number;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  response: OpenSerpSearchResponse;
  provider: OpenSerpProviderInfo;
}> {
  const env = input.env ?? process.env;
  const baseUrl = env.OPENSERP_LOCAL_URL?.trim();

  if (baseUrl) {
    const client = createOpenSerpClient({ env, baseUrl });
    const response = await client.search({
      engine: input.engine,
      query: input.query,
      limit: input.limit,
      locale: "fr-MA",
    });
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
  const { stdout } = await execFileAsync(
    binary,
    [
      "search",
      input.engine,
      input.query,
      "--format",
      "json",
      "--limit",
      String(Math.min(Math.max(Math.trunc(input.limit), 1), 20)),
      "--search-timeout",
      "60",
      "--quiet",
    ],
    {
      timeout: 70000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    },
  );

  const parsed = JSON.parse(stdout) as {
    query?: { text?: string };
    meta?: { requested_at?: string; version?: string };
    results?: OpenSerpSearchResponse["results"];
  };

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

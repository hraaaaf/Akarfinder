import { createOpenSerpClient } from "@/lib/openserp-async/openserp-client";
import { mapOpenSerpSearchResponseToPublicPropertyIndexRecords } from "@/lib/openserp-async/openserp-mapper";
import { assertOpenSerpEngineAllowed } from "@/lib/openserp-async/openserp-policy";
import { createPublicPropertyIndexStore, PUBLIC_PROPERTY_INDEX_FIXTURES } from "@/lib/public-property-index/index-store";
import type { OpenSerpEngine } from "@/lib/openserp-async/types";
import { pathToFileURL } from "node:url";

function parseArgs(argv: string[]): {
  engine: OpenSerpEngine;
  query: string;
  limit: number;
  write: boolean;
} {
  let engine: OpenSerpEngine = "bing";
  let query = "appartement casablanca";
  let limit = 10;
  let write = false;

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const value = rest.join("=").trim();
    const key = rawKey.trim();

    if (key === "engine" && (value === "bing" || value === "ecosia" || value === "google")) {
      engine = value;
    }
    if (key === "query" && value) query = value;
    if (key === "limit" && value) limit = Number(value);
    if (key === "write") write = value !== "false";
  }

  return {
    engine,
    query,
    limit: Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 20) : 10,
    write,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (process.env.PUBLIC_INDEX_POC_ENABLED !== "true" || process.env.OPENSERP_ASYNC_FEEDER_ENABLED !== "true") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dry_run: true,
          reason: "async_feeder_disabled",
          engine: args.engine,
          query: args.query,
          results: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  assertOpenSerpEngineAllowed(args.engine, process.env);
  const client = createOpenSerpClient({ env: process.env });
  const response = await client.search({ engine: args.engine, query: args.query, limit: args.limit, locale: "fr-MA" });
  const records = mapOpenSerpSearchResponseToPublicPropertyIndexRecords(response, {
    query: args.query,
    provider_engine: args.engine,
    observed_at: response.fetched_at,
    result_source: "openserp_async_poc",
  });

  const writeRequested = args.write && process.env.PUBLIC_INDEX_POC_WRITE === "true";
  if (!writeRequested) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dry_run: true,
          engine: args.engine,
          query: args.query,
          results: records,
        },
        null,
        2,
      ),
    );
    return;
  }

  const store = createPublicPropertyIndexStore({
    env: process.env,
    seedRecords: PUBLIC_PROPERTY_INDEX_FIXTURES,
  });
  await store.upsert(records);

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry_run: false,
        engine: args.engine,
        query: args.query,
        written: records.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}

export { main, parseArgs };

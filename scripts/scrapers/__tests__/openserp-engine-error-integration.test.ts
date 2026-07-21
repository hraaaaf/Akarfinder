// OPENSERP-ENGINE-FAILURE-OBSERVABILITY-1 -- integration proof that the
// real (unmodified) runIngestionCycle() correctly classifies and logs 7
// distinguishable engine-call failure categories through the full
// orchestrator loop, using a PGlite-backed fake Supabase client (real
// state repositories, no real network). Run via the dedicated
// `test:openserp-time-budget-and-lock-safety` npm script (requires
// --experimental-test-module-mocks, since it replaces the openserp-live
// module).

import { test, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeFakeSupabaseClient } from "./helpers/fake-supabase-postgrest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260718140000_create_openserp_query_rotation_state.sql",
  "20260718140100_create_openserp_engine_budget_state.sql",
  "20260718180000_create_openserp_ingestion_run_lock.sql",
];

let db: InstanceType<typeof PGlite>;
const now = () => 1_700_000_000_000;

// Maps a query_text marker to the exact underlying error the fake engine
// throws -- one distinguishable case per target category, mirroring what
// each real failure mode looks like (AbortError-driven timeout, a message
// containing "captcha", an OpenSerpHttpError-shaped 403/429, a Node system
// error code for DNS/connection failure, a JSON-parse SyntaxError, and a
// generic error carrying no recognizable signal at all).
class FakeEngineCallError extends Error {
  outcome: string;
  errorCode: string | null;
  httpStatus: number | null;
  causeName: string | null;
  constructor(message: string, outcome: string, diagnostics: { errorCode?: string | null; httpStatus?: number | null; causeName?: string | null } = {}) {
    super(message);
    this.name = "EngineCallError";
    this.outcome = outcome;
    this.errorCode = diagnostics.errorCode ?? null;
    this.httpStatus = diagnostics.httpStatus ?? null;
    this.causeName = diagnostics.causeName ?? null;
  }
}

function throwForMarker(queryText: string, engine: string): never {
  if (queryText.includes("trigger-timeout")) {
    throw new FakeEngineCallError(`engine ${engine} timed out after 15000ms`, "engine_timeout", { causeName: "AbortError" });
  }
  if (queryText.includes("trigger-captcha")) {
    throw new FakeEngineCallError(`engine ${engine} network error: a CAPTCHA challenge was detected`, "network_error");
  }
  if (queryText.includes("trigger-403")) {
    throw new FakeEngineCallError(`engine ${engine} network error: OpenSERP local endpoint returned 403`, "network_error", {
      httpStatus: 403,
      causeName: "OpenSerpHttpError",
    });
  }
  if (queryText.includes("trigger-429")) {
    throw new FakeEngineCallError(`engine ${engine} network error: OpenSERP local endpoint returned 429`, "network_error", {
      httpStatus: 429,
      causeName: "OpenSerpHttpError",
    });
  }
  if (queryText.includes("trigger-dns")) {
    throw new FakeEngineCallError(`engine ${engine} network error: connect ECONNREFUSED 127.0.0.1:7001`, "network_error", {
      errorCode: "ECONNREFUSED",
    });
  }
  if (queryText.includes("trigger-malformed")) {
    throw new FakeEngineCallError(`engine ${engine} returned invalid JSON: Unexpected token < in JSON at position 0`, "invalid_response", {
      causeName: "SyntaxError",
    });
  }
  if (queryText.includes("trigger-unknown")) {
    throw new FakeEngineCallError(`engine ${engine} network error: something bizarre and unrecognized happened`, "network_error");
  }
  throw new Error(`test fixture bug: unrecognized query marker in "${queryText}"`);
}

before(async () => {
  db = new PGlite();
  await db.exec("create role service_role;");
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  mock.module("@/lib/db/supabase-client", {
    namedExports: { getSupabaseServerClient: () => makeFakeSupabaseClient(db, () => 0) },
  });
  mock.module("@/lib/openserp-ingestion/openserp-live", {
    namedExports: {
      DEFAULT_ENGINE_CALL_TIMEOUT_MS: 15_000,
      EngineCallError: FakeEngineCallError,
      runOpenSerpLiveQuery: async (input: { engine: string; query: string }) => {
        throwForMarker(input.query, input.engine);
      },
    },
  });
});

beforeEach(async () => {
  await db.exec("delete from openserp_query_rotation_state; delete from openserp_engine_budget_state; delete from openserp_ingestion_run_lock;");
});

after(() => {
  mock.reset();
});

const MARKERS = ["trigger-timeout", "trigger-captcha", "trigger-403", "trigger-429", "trigger-dns", "trigger-malformed", "trigger-unknown"];

function writeFixture(): string {
  const universe = {
    universe_version: "engine-error-integration-fixture",
    queries: MARKERS.map((marker, i) => ({
      query_id: `eei-q${i + 1}`,
      city: "Casablanca",
      district: null,
      priority_tier: 1 as const,
      transaction: "sale" as const,
      property_type: "appartement",
      language: "fr" as const,
      preferred_engine: "duckduckgo" as const,
      query_text: `${marker} fixture query ${i + 1}`,
      target_domain: null,
      query_family: "general" as const,
    })),
  };
  const path = join(tmpdir(), `openserp-engine-error-fixture-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return path;
}

test("runIngestionCycle classifies and logs all 7 engine-error categories distinctly", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");

  const logLines: string[] = [];
  const restore = mock.method(console, "info", (line: string) => {
    logLines.push(line);
  });

  let metrics;
  try {
    const universePath = writeFixture();
    const result = await runIngestionCycle({
      runId: "engine-error-integration-run",
      scheduledAtIso: new Date(now()).toISOString(),
      universePath,
      write: false,
      batchSizeOverride: MARKERS.length,
      now,
    });
    metrics = result.metrics;
  } finally {
    restore.mock.restore();
  }

  // Every query fails on both attempted engines (preferred_engine +
  // fallback, since defaultBudgetState() has all 3 engines active) -- so
  // each of the 7 categories is hit exactly twice.
  assert.equal(metrics.query_success_count, 0);
  assert.equal(metrics.query_failure_count, 14);
  assert.deepEqual(metrics.engine_error_category_breakdown, {
    timeout: 2,
    captcha: 2,
    http_403: 2,
    http_429: 2,
    dns_network: 2,
    malformed_response: 2,
    unknown: 2,
  });

  const engineCallLines = logLines.filter((line) => line.startsWith("[engine-call] "));
  assert.equal(engineCallLines.length, 14);

  const parsedEntries = engineCallLines.map((line) => JSON.parse(line.slice("[engine-call] ".length)));
  assert.ok(parsedEntries.every((entry) => entry.attempt_outcome === "failure"));
  assert.ok(parsedEntries.every((entry) => typeof entry.duration_ms === "number"));

  const categoriesSeen = new Set(parsedEntries.map((entry) => entry.category));
  assert.deepEqual(
    [...categoriesSeen].sort(),
    ["captcha", "dns_network", "http_403", "http_429", "malformed_response", "timeout", "unknown"],
  );

  // No log line may ever carry a raw URL, and every message must be
  // present as a short, plain string (sanitization already applied by the
  // orchestrator before logging).
  for (const entry of parsedEntries) {
    assert.ok(!/https?:\/\//.test(entry.message ?? ""), `log line leaked a raw URL: ${entry.message}`);
    assert.ok((entry.message ?? "").length <= 300);
  }
});

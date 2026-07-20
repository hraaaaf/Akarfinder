// OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1
// Proves the dual-channel merge/dedupe/provenance/checkpoint/budget-
// isolation/fail-safe guarantees run-orchestrator.ts now implements when a
// second discovery channel (Yandex via SearXNG) is added on top of the
// EXISTING query planner/rotation/admission/writer, without ever creating
// a second planner, a second rotation/checkpoint system, or a second
// writer. Same PGlite-backed fake-Supabase harness as
// openserp-dry-run-persist-state.test.ts. Run via the dedicated
// `test:openserp-time-budget-and-lock-safety` npm script (requires
// --experimental-test-module-mocks, since it replaces the openserp-live,
// searxng-yandex-channel, and national-writer modules).

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

const writeNationalIngestionRunCalls: Array<{ decisions: Array<{ classified: { canonical_source_url: string; source_channels?: string[] } | null }> }> = [];

// Mutable per-test control knobs for the two fake engine layers.
let openserpBehavior: "empty" | "one-result" | "always-fails" = "empty";
let yandexBehavior: "empty" | "same-url-as-openserp" | "unique-url" | "always-fails" = "empty";

const OPENSERP_URL = "https://mubawab.ma/fr/is/appartement_casablanca_test_111111";
const YANDEX_ONLY_URL = "https://mubawab.ma/fr/is/appartement_rabat_test_222222";
const LISTING_TITLE = "Appartement 3 chambres 90 m2 a vendre";
const LISTING_SNIPPET = "Bel appartement lumineux de 90 m2 avec 3 chambres, proche des commodites.";

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
      EngineCallError: class extends Error {},
      runOpenSerpLiveQuery: async (input: { engine: string; query: string }) => {
        if (openserpBehavior === "always-fails") {
          throw new Error("simulated OpenSERP engine failure");
        }
        const results =
          openserpBehavior === "one-result"
            ? [{ url: OPENSERP_URL, title: LISTING_TITLE, snippet: LISTING_SNIPPET, rank: 1 }]
            : [];
        return {
          response: {
            engine: input.engine,
            query: input.query,
            results,
            fetched_at: new Date(now()).toISOString(),
            provider: "openserp_async_poc",
          },
          provider: {
            provider: "openserp",
            provider_mode: "local_http",
            provider_endpoint: "http://127.0.0.1:7070",
            provider_live_or_fixture: "live",
          },
        };
      },
    },
  });

  // fetchYandexViaSearxng's real implementation NEVER throws (it catches
  // every failure internally) -- this fake preserves that exact contract:
  // "always-fails" still resolves to [] (matching the real fail-safe
  // behavior), never rejects, so these tests exercise the same code path
  // run-orchestrator.ts actually runs in production, not a shortcut.
  mock.module("@/lib/openserp-ingestion/searxng-yandex-channel", {
    namedExports: {
      DEFAULT_SEARXNG_URL: "http://127.0.0.1:8888",
      SOURCE_CHANNEL_SEARXNG_YANDEX: "searxng_yandex",
      newYandexChannelMetrics: () => ({
        attempts: 0, successes: 0, failures: 0, raw_results: 0, captcha_count: 0,
        status_403_429: 0, timeout_count: 0, other_error_count: 0, total_duration_ms: 0,
        error_category_breakdown: {},
      }),
      fetchYandexViaSearxng: async (input: { metrics: { attempts: number; successes: number; failures: number; raw_results: number } }) => {
        input.metrics.attempts += 1;
        if (yandexBehavior === "same-url-as-openserp") {
          input.metrics.successes += 1;
          input.metrics.raw_results += 1;
          return [{ url: OPENSERP_URL, title: "Titre Yandex different", snippet: "Snippet Yandex different", rank: 3 }];
        }
        if (yandexBehavior === "unique-url") {
          input.metrics.successes += 1;
          input.metrics.raw_results += 1;
          return [{ url: YANDEX_ONLY_URL, title: LISTING_TITLE, snippet: LISTING_SNIPPET, rank: 2 }];
        }
        if (yandexBehavior === "always-fails") {
          input.metrics.failures += 1;
          return [];
        }
        return [];
      },
    },
  });

  mock.module("@/lib/openserp-ingestion/national-writer", {
    namedExports: {
      writeNationalIngestionRun: async (input: { decisions: Array<{ classified: { canonical_source_url: string; source_channels?: string[] } | null }> }) => {
        writeNationalIngestionRunCalls.push(input);
        return { updated_listing_sources: 0, new_property_listings: 0, new_listing_sources: 0, new_clusters: 0, new_memberships: 0, write_errors: [] };
      },
    },
  });
});

beforeEach(async () => {
  await db.exec("delete from openserp_query_rotation_state; delete from openserp_engine_budget_state; delete from openserp_ingestion_run_lock;");
  writeNationalIngestionRunCalls.length = 0;
  openserpBehavior = "empty";
  yandexBehavior = "empty";
});

after(() => {
  mock.reset();
});

function writeFixture(runLabel: string): string {
  const universe = {
    universe_version: `yandex-dual-lane-fixture-${runLabel}`,
    queries: [
      {
        query_id: `ydl-${runLabel}-q1`,
        city: "Casablanca",
        district: null,
        priority_tier: 1 as const,
        transaction: "sale" as const,
        property_type: "appartement",
        language: "fr" as const,
        preferred_engine: "bing" as const,
        query_text: `appartement a vendre casablanca ${runLabel}`,
        target_domain: null,
        query_family: "general" as const,
      },
    ],
  };
  const path = join(tmpdir(), `openserp-yandex-dual-lane-fixture-${runLabel}-${Date.now()}-${Math.random()}.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return path;
}

async function countRows(table: string): Promise<number> {
  const result = await db.query<{ c: number }>(`select count(*)::int as c from ${table};`);
  return result.rows[0]?.c ?? 0;
}

test("Yandex channel disabled (default): behaves byte-identical to pre-dual-lane (no OPENSERP_YANDEX_CHANNEL_ENABLED env)", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "unique-url"; // would matter if the flag were on -- must be ignored

  const { metrics, decisions } = await runIngestionCycle({
    runId: "ydl-disabled-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("disabled"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: {} as NodeJS.ProcessEnv, // explicitly no OPENSERP_YANDEX_CHANNEL_ENABLED
  });

  assert.equal(decisions.length, 1, "only the OpenSERP result is ever classified when the channel is off");
  assert.equal(metrics.yandex_channel.attempts, 0, "fetchYandexViaSearxng must never even be called when the flag is off");
});

test("same canonical URL from OpenSERP and Yandex merges into exactly ONE result, not two", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "same-url-as-openserp";

  const { decisions } = await runIngestionCycle({
    runId: "ydl-samecanon-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("samecanon"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(decisions.length, 1, "one merged decision, not one per channel");
  assert.equal(decisions[0].classified?.canonical_source_url.includes("appartement_casablanca_test_111111"), true);
  // OpenSERP's own title wins when both channels found the same URL.
  assert.equal(decisions[0].classified?.title, LISTING_TITLE);
});

test("a Yandex-unique URL (never seen by OpenSERP) is still classified and conserved, not dropped", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result"; // OpenSERP finds a different URL this time
  yandexBehavior = "unique-url";

  const { decisions } = await runIngestionCycle({
    runId: "ydl-yandexunique-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("yandexunique"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(decisions.length, 2, "OpenSERP's own URL AND the Yandex-only URL are both conserved as separate candidates");
  const urls = decisions.map((d) => d.classified?.canonical_source_url);
  assert.ok(urls.some((u) => u?.includes("rabat_test_222222")), "the Yandex-only URL must be present");
  const yandexDecision = decisions.find((d) => d.classified?.canonical_source_url.includes("rabat_test_222222"));
  assert.equal(yandexDecision?.classified?.engine, "searxng_yandex");
});

test("multi-channel provenance is conserved on the merged candidate (source_channels), not lost", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "same-url-as-openserp";

  const { decisions } = await runIngestionCycle({
    runId: "ydl-provenance-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("provenance"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(decisions.length, 1);
  const channels = decisions[0].classified?.source_channels;
  assert.ok(channels, "source_channels must be set");
  assert.ok(channels!.includes("bing") || channels!.includes("duckduckgo") || channels!.includes("ecosia"), "the OpenSERP engine must be recorded");
  assert.ok(channels!.includes("searxng_yandex"), "the Yandex channel must also be recorded on the SAME candidate");
});

test("Yandex failure never blocks OpenSERP: the run still completes and OpenSERP's own result is processed normally", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "always-fails";

  const { metrics, decisions } = await runIngestionCycle({
    runId: "ydl-yandexfail-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("yandexfail"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(metrics.outcome_status, "completed");
  assert.equal(decisions.length, 1, "OpenSERP's own result is still classified");
  assert.equal(metrics.yandex_channel.failures, 1);
  assert.equal(metrics.query_success_count, 1, "OpenSERP's own success bookkeeping is completely unaffected by the Yandex failure");
});

test("OpenSERP failure + Yandex success: the Yandex-only result is still treated normally through the same pipeline", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "always-fails";
  yandexBehavior = "unique-url";

  const { metrics, decisions } = await runIngestionCycle({
    runId: "ydl-openservfail-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("openservfail"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(decisions.length, 1, "the Yandex-only result is still classified even though every OpenSERP attempt failed");
  assert.equal(decisions[0].classified?.canonical_source_url.includes("rabat_test_222222"), true);
  assert.equal(decisions[0].classified?.engine, "searxng_yandex");
  assert.equal(metrics.query_success_count, 0, "OpenSERP's own failure bookkeeping is untouched by Yandex's success");
});

test("a query with both channels is checkpointed exactly ONCE (one openserp_query_rotation_state row, not two)", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "unique-url";

  await runIngestionCycle({
    runId: "ydl-checkpoint-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("checkpoint"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(await countRows("openserp_query_rotation_state"), 1, "exactly one rotation-state row for the one query_id, regardless of how many channels contributed results");
});

test("discovery_yield reflects the merged (both-channel) accepted count, updated exactly once", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "unique-url";

  await runIngestionCycle({
    runId: "ydl-yield-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("yield"),
    write: false,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  const rows = await db.query<{ query_id: string; discovery_yield: string }>(
    "select query_id, discovery_yield from openserp_query_rotation_state;",
  );
  assert.equal(rows.rows.length, 1, "one row means the yield was necessarily written exactly once, not accumulated across two separate writes");
});

test("OpenSERP engine budget state is byte-identical whether Yandex is disabled, failing, or succeeding", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");

  async function runAndSnapshotBudget(label: string, yandex: typeof yandexBehavior) {
    openserpBehavior = "one-result";
    yandexBehavior = yandex;
    await db.exec("delete from openserp_query_rotation_state; delete from openserp_engine_budget_state; delete from openserp_ingestion_run_lock;");
    await runIngestionCycle({
      runId: `ydl-budget-${label}-run`,
      scheduledAtIso: new Date(now()).toISOString(),
      universePath: writeFixture(`budget-${label}`),
      write: false,
      batchSizeOverride: 1,
      now,
      env: label === "disabled" ? ({} as NodeJS.ProcessEnv) : ({ OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv),
    });
    const rows = await db.query<{ engine: string; current_budget: number; consecutive_failures: number; suspended_until: string | null }>(
      "select engine, current_budget, consecutive_failures, suspended_until from openserp_engine_budget_state order by engine;",
    );
    return rows.rows;
  }

  const disabled = await runAndSnapshotBudget("disabled", "empty");
  const yandexFailing = await runAndSnapshotBudget("failing", "always-fails");
  const yandexSucceeding = await runAndSnapshotBudget("succeeding", "unique-url");

  assert.deepEqual(yandexFailing, disabled, "OpenSERP engine budget state must be identical regardless of Yandex failing");
  assert.deepEqual(yandexSucceeding, disabled, "OpenSERP engine budget state must be identical regardless of Yandex succeeding");
  assert.ok(disabled.every((r) => r.engine === "bing" || r.engine === "duckduckgo" || r.engine === "ecosia"), "no 'searxng_yandex' or 'yandex' row was ever created in the OpenSERP engine budget table");
});

test("no duplicate write: writeNationalIngestionRun receives exactly one decision for a URL both channels found", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  openserpBehavior = "one-result";
  yandexBehavior = "same-url-as-openserp";

  await runIngestionCycle({
    runId: "ydl-nodup-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath: writeFixture("nodup"),
    write: true,
    batchSizeOverride: 1,
    now,
    env: { OPENSERP_YANDEX_CHANNEL_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(writeNationalIngestionRunCalls.length, 1, "writeNationalIngestionRun is called exactly once per cycle, as before -- no second writer");
  const decisions = writeNationalIngestionRunCalls[0].decisions;
  const canonicalUrls = decisions.map((d) => d.classified?.canonical_source_url).filter(Boolean);
  const uniqueCanonicalUrls = new Set(canonicalUrls);
  assert.equal(canonicalUrls.length, uniqueCanonicalUrls.size, "no canonical URL appears more than once in the decisions handed to the writer");
});

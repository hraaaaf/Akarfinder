// NIGHTLY-INGESTION-ORCHESTRATOR-1
// Unit tests for the nightly ingestion runner.
// Uses mock deps — no actual subprocess spawning, no DB access, no Supabase calls.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";

import {
  readNightlyConfig,
  shouldStopOnErrors,
  buildReportPath,
  runNightlyIngestion,
  NIGHTLY_AUTHORIZED_SOURCES,
  SEARCH_GATEWAY_SOURCES,
  type NightlyConfig,
  type NightlyDeps,
  type NightlyReport,
  type SpawnResult,
} from "../../nightly-ingestion-runner.js";

import type { IngestStats } from "../../scrapers/ingest-clean-listings.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TMP_DIR = join(tmpdir(), "nightly-runner-tests-" + process.pid);

const SUCCESS_SPAWN: SpawnResult = { success: true, output: "", duration_ms: 50 };
const FAIL_SPAWN: SpawnResult = { success: false, output: "error", duration_ms: 10 };

const EMPTY_STATS: IngestStats = {
  totalCleanRead: 0,
  insertedRaw: 0,
  insertedProperty: 0,
  updatedProperty: 0,
  insertedSources: 0,
  updatedSources: 0,
  skipped: 0,
  errors: 0,
};

function mockDeps(overrides: Partial<NightlyDeps> = {}): NightlyDeps {
  return {
    scrape: async () => SUCCESS_SPAWN,
    ingest: async () => ({ success: true, stats: EMPTY_STATS }),
    enrich: async () => ({ success: true }),
    syncSupabase: async () => SUCCESS_SPAWN,
    getLocalCounts: () => ({ raw_listings: 10, property_listings: 50, listing_sources: 60 }),
    getSupabaseCount: async () => 50,
    writeReport: async (path, report) => {
      const dir = join(path, "..");
      mkdirSync(dir, { recursive: true });
      require("fs").writeFileSync(path, JSON.stringify(report, null, 2));
    },
    log: () => {},
    sleep: async () => {},
    ...overrides,
  };
}

function baseConfig(overrides: Partial<NightlyConfig> = {}): NightlyConfig {
  return {
    enabled: true,
    max_cycles: 2,
    delay_minutes: 0,
    stop_on_error_count: 2,
    sync_supabase: false,
    report_dir: TMP_DIR,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

// ─── readNightlyConfig — defaults ─────────────────────────────────────────────

describe("readNightlyConfig — default values", () => {
  it("enabled=true when NIGHTLY_INGESTION_ENABLED not set", () => {
    const saved = process.env.NIGHTLY_INGESTION_ENABLED;
    delete process.env.NIGHTLY_INGESTION_ENABLED;
    const cfg = readNightlyConfig();
    assert.equal(cfg.enabled, true);
    if (saved !== undefined) process.env.NIGHTLY_INGESTION_ENABLED = saved;
  });

  it("max_cycles defaults to 3", () => {
    const saved = process.env.NIGHTLY_MAX_CYCLES;
    delete process.env.NIGHTLY_MAX_CYCLES;
    const cfg = readNightlyConfig();
    assert.equal(cfg.max_cycles, 3);
    if (saved !== undefined) process.env.NIGHTLY_MAX_CYCLES = saved;
  });

  it("delay_minutes defaults to 20", () => {
    const saved = process.env.NIGHTLY_DELAY_MINUTES;
    delete process.env.NIGHTLY_DELAY_MINUTES;
    const cfg = readNightlyConfig();
    assert.equal(cfg.delay_minutes, 20);
    if (saved !== undefined) process.env.NIGHTLY_DELAY_MINUTES = saved;
  });

  it("stop_on_error_count defaults to 2", () => {
    const saved = process.env.NIGHTLY_STOP_ON_ERROR_COUNT;
    delete process.env.NIGHTLY_STOP_ON_ERROR_COUNT;
    const cfg = readNightlyConfig();
    assert.equal(cfg.stop_on_error_count, 2);
    if (saved !== undefined) process.env.NIGHTLY_STOP_ON_ERROR_COUNT = saved;
  });

  it("sync_supabase defaults to false", () => {
    const saved = process.env.NIGHTLY_SYNC_SUPABASE;
    delete process.env.NIGHTLY_SYNC_SUPABASE;
    const cfg = readNightlyConfig();
    assert.equal(cfg.sync_supabase, false);
    if (saved !== undefined) process.env.NIGHTLY_SYNC_SUPABASE = saved;
  });

  it("report_dir defaults to data/nightly-reports", () => {
    const saved = process.env.NIGHTLY_REPORT_DIR;
    delete process.env.NIGHTLY_REPORT_DIR;
    const cfg = readNightlyConfig();
    assert.equal(cfg.report_dir, "data/nightly-reports");
    if (saved !== undefined) process.env.NIGHTLY_REPORT_DIR = saved;
  });
});

// ─── readNightlyConfig — env var reading ──────────────────────────────────────

describe("readNightlyConfig — env var reading", () => {
  it("reads NIGHTLY_INGESTION_ENABLED=false → enabled=false", () => {
    process.env.NIGHTLY_INGESTION_ENABLED = "false";
    const cfg = readNightlyConfig();
    assert.equal(cfg.enabled, false);
    delete process.env.NIGHTLY_INGESTION_ENABLED;
  });

  it("reads NIGHTLY_MAX_CYCLES=6", () => {
    process.env.NIGHTLY_MAX_CYCLES = "6";
    const cfg = readNightlyConfig();
    assert.equal(cfg.max_cycles, 6);
    delete process.env.NIGHTLY_MAX_CYCLES;
  });

  it("reads NIGHTLY_SYNC_SUPABASE=true", () => {
    process.env.NIGHTLY_SYNC_SUPABASE = "true";
    const cfg = readNightlyConfig();
    assert.equal(cfg.sync_supabase, true);
    delete process.env.NIGHTLY_SYNC_SUPABASE;
  });

  it("reads NIGHTLY_STOP_ON_ERROR_COUNT=3", () => {
    process.env.NIGHTLY_STOP_ON_ERROR_COUNT = "3";
    const cfg = readNightlyConfig();
    assert.equal(cfg.stop_on_error_count, 3);
    delete process.env.NIGHTLY_STOP_ON_ERROR_COUNT;
  });

  it("clamps max_cycles to minimum 1", () => {
    process.env.NIGHTLY_MAX_CYCLES = "0";
    const cfg = readNightlyConfig();
    assert.ok(cfg.max_cycles >= 1);
    delete process.env.NIGHTLY_MAX_CYCLES;
  });
});

// ─── shouldStopOnErrors ───────────────────────────────────────────────────────

describe("shouldStopOnErrors", () => {
  it("returns false when error_count < stop_limit", () => {
    assert.equal(shouldStopOnErrors(1, 2), false);
  });

  it("returns true when error_count === stop_limit", () => {
    assert.equal(shouldStopOnErrors(2, 2), true);
  });

  it("returns true when error_count > stop_limit", () => {
    assert.equal(shouldStopOnErrors(5, 2), true);
  });

  it("returns false at 0 errors", () => {
    assert.equal(shouldStopOnErrors(0, 2), false);
  });
});

// ─── buildReportPath ──────────────────────────────────────────────────────────

describe("buildReportPath", () => {
  it("contains the date in YYYY-MM-DD format", () => {
    const d = new Date("2026-07-02T03:00:00Z");
    const path = buildReportPath("data/nightly-reports", d);
    assert.ok(path.includes("2026-07-02"), `path=${path}`);
  });

  it("filename starts with nightly-ingestion-", () => {
    const path = buildReportPath("/tmp/reports", new Date("2026-07-02"));
    assert.ok(path.split(/[\\/]/).pop()!.startsWith("nightly-ingestion-"));
  });

  it("extension is .json", () => {
    const path = buildReportPath("/tmp/reports", new Date());
    assert.ok(path.endsWith(".json"));
  });
});

// ─── runNightlyIngestion — disabled ──────────────────────────────────────────

describe("runNightlyIngestion — disabled", () => {
  it("skips all steps when enabled=false", async () => {
    let scrapeCallCount = 0;
    const deps = mockDeps({ scrape: async () => { scrapeCallCount++; return SUCCESS_SPAWN; } });
    const report = await runNightlyIngestion(baseConfig({ enabled: false }), deps);
    assert.equal(scrapeCallCount, 0);
    assert.equal(report.cycles_completed, 0);
    assert.equal(report.supabase_sync_status, "skipped");
  });
});

// ─── runNightlyIngestion — cycles ─────────────────────────────────────────────

describe("runNightlyIngestion — cycles", () => {
  it("completes requested number of cycles on success", async () => {
    const report = await runNightlyIngestion(baseConfig({ max_cycles: 3 }), mockDeps());
    assert.equal(report.cycles_completed, 3);
    assert.equal(report.cycles_requested, 3);
  });

  it("stops early when error count reaches stop_on_error_count", async () => {
    let callCount = 0;
    const deps = mockDeps({
      scrape: async () => { callCount++; return FAIL_SPAWN; },
    });
    const report = await runNightlyIngestion(
      baseConfig({ max_cycles: 5, stop_on_error_count: 2 }),
      deps
    );
    // Should stop at 2 errors, not run all 5
    assert.ok(report.errors >= 2);
    assert.ok(callCount < 5);
  });

  it("does NOT stop on enrich failure (non-critical)", async () => {
    const report = await runNightlyIngestion(
      baseConfig({ max_cycles: 2 }),
      mockDeps({ enrich: async () => ({ success: false }) })
    );
    // Enrich failure adds to errors but doesn't break the cycle
    assert.equal(report.cycles_completed, 2);
  });
});

// ─── runNightlyIngestion — Supabase sync ──────────────────────────────────────

describe("runNightlyIngestion — Supabase sync", () => {
  it("does NOT call syncSupabase when sync_supabase=false", async () => {
    let syncCalled = false;
    const deps = mockDeps({ syncSupabase: async () => { syncCalled = true; return SUCCESS_SPAWN; } });
    await runNightlyIngestion(baseConfig({ sync_supabase: false }), deps);
    assert.equal(syncCalled, false);
  });

  it("calls syncSupabase when sync_supabase=true", async () => {
    let syncCalled = false;
    const deps = mockDeps({ syncSupabase: async () => { syncCalled = true; return SUCCESS_SPAWN; } });
    await runNightlyIngestion(baseConfig({ sync_supabase: true }), deps);
    assert.equal(syncCalled, true);
  });

  it("sets supabase_sync_status=ok on sync success", async () => {
    const report = await runNightlyIngestion(
      baseConfig({ sync_supabase: true }),
      mockDeps({ syncSupabase: async () => SUCCESS_SPAWN })
    );
    assert.equal(report.supabase_sync_status, "ok");
  });

  it("sets supabase_sync_status=error on sync failure", async () => {
    const report = await runNightlyIngestion(
      baseConfig({ sync_supabase: true }),
      mockDeps({ syncSupabase: async () => FAIL_SPAWN })
    );
    assert.equal(report.supabase_sync_status, "error");
  });

  it("sets supabase_sync_status=skipped when sync disabled", async () => {
    const report = await runNightlyIngestion(baseConfig({ sync_supabase: false }), mockDeps());
    assert.equal(report.supabase_sync_status, "skipped");
  });
});

// ─── runNightlyIngestion — report generation ──────────────────────────────────

describe("runNightlyIngestion — report generation", () => {
  it("writeReport is called with a valid path and report", async () => {
    let capturedPath = "";
    let capturedReport: NightlyReport | null = null;
    const deps = mockDeps({
      writeReport: async (path, report) => {
        capturedPath = path;
        capturedReport = report;
      },
    });
    await runNightlyIngestion(baseConfig(), deps);
    assert.ok(capturedPath.endsWith(".json"));
    assert.ok(capturedReport !== null);
    assert.ok(typeof capturedReport!.started_at === "string");
    assert.ok(typeof capturedReport!.finished_at === "string");
    assert.ok(typeof capturedReport!.cycles_completed === "number");
  });

  it("report contains all required fields", async () => {
    let report: NightlyReport | null = null;
    const deps = mockDeps({
      writeReport: async (_path, r) => { report = r; },
    });
    await runNightlyIngestion(baseConfig(), deps);
    assert.ok(report !== null);
    const r = report!;
    assert.ok("started_at" in r);
    assert.ok("finished_at" in r);
    assert.ok("cycles_requested" in r);
    assert.ok("cycles_completed" in r);
    assert.ok("sources_attempted" in r);
    assert.ok("property_listings_before" in r);
    assert.ok("property_listings_after" in r);
    assert.ok("created" in r);
    assert.ok("updated" in r);
    assert.ok("duplicates_skipped" in r);
    assert.ok("errors" in r);
    assert.ok("supabase_sync_status" in r);
  });

  it("report does NOT contain contact/PII/image fields", async () => {
    let report: NightlyReport | null = null;
    const deps = mockDeps({ writeReport: async (_p, r) => { report = r; } });
    await runNightlyIngestion(baseConfig(), deps);
    const keys = Object.keys(report!);
    const forbidden = ["phone", "email", "whatsapp", "image_url", "image_download", "contact"];
    for (const f of forbidden) {
      assert.ok(!keys.some(k => k.includes(f)), `report must not contain '${f}' field`);
    }
  });
});

// ─── Authorized sources guard ─────────────────────────────────────────────────

describe("NIGHTLY_AUTHORIZED_SOURCES — Search Gateway excluded", () => {
  it("NIGHTLY_AUTHORIZED_SOURCES does not include any Search Gateway source", () => {
    for (const sgSource of SEARCH_GATEWAY_SOURCES) {
      assert.ok(
        !NIGHTLY_AUTHORIZED_SOURCES.includes(sgSource),
        `Search Gateway source '${sgSource}' must not be in NIGHTLY_AUTHORIZED_SOURCES`
      );
    }
  });

  it("NIGHTLY_AUTHORIZED_SOURCES only contains direct scraper sources", () => {
    const allowed = new Set(["avito", "mubawab", "sarouty"]);
    for (const src of NIGHTLY_AUTHORIZED_SOURCES) {
      assert.ok(allowed.has(src), `Unexpected source '${src}' in NIGHTLY_AUTHORIZED_SOURCES`);
    }
  });

  it("report sources_attempted does not include Search Gateway sources", async () => {
    const report = await runNightlyIngestion(baseConfig(), mockDeps());
    for (const src of report.sources_attempted) {
      assert.ok(
        !SEARCH_GATEWAY_SOURCES.includes(src),
        `sources_attempted must not include Search Gateway source '${src}'`
      );
    }
  });

  it("SEARCH_GATEWAY_SOURCES list is non-empty", () => {
    assert.ok(SEARCH_GATEWAY_SOURCES.length > 0);
    assert.ok(SEARCH_GATEWAY_SOURCES.includes("search_gateway"));
    assert.ok(SEARCH_GATEWAY_SOURCES.includes("serper"));
  });
});

// ─── Deduplication guarantee ─────────────────────────────────────────────────

describe("runNightlyIngestion — deduplication guarantee", () => {
  it("running same ingest twice does not double-count created listings", async () => {
    const statsPerRun: IngestStats = { ...EMPTY_STATS, insertedProperty: 5, updatedProperty: 10 };
    let runCount = 0;
    const deps = mockDeps({
      ingest: async () => {
        runCount++;
        return { success: true, stats: statsPerRun };
      },
    });
    const report = await runNightlyIngestion(baseConfig({ max_cycles: 2 }), deps);
    // created = 5 per cycle × 2 cycles = 10 total (not doubled by bug)
    assert.equal(report.created, 10);
    assert.equal(runCount, 2);
  });
});

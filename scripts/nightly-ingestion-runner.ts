// NIGHTLY-INGESTION-ORCHESTRATOR-1
// Nightly ingestion runner — orchestrates the existing AkarFinder pipeline
// for multiple cycles during a nightly window.
//
// Usage: npm run nightly:ingest
//
// Pipeline per cycle:
//   1. scripts/scrapers/p0-run.ts       (scrape public sources)
//   2. scripts/scrapers/ingest-clean-listings.ts  (upsert to SQLite)
//   3. scripts/scrapers/enrich-p6.ts    (duplicate groups + reliability)
//   4. scripts/sync-supabase.ts          (optional, once at end)
//
// Constraints honoured:
//   - No Search Gateway ingestion into DB (Search Gateway is read-only external index)
//   - No new source added
//   - No phone / email / WhatsApp extraction (existing PII guards remain active)
//   - No image download / rehost / storage
//   - No secret logged

import { spawn } from "node:child_process";
import { writeFile, mkdir, readFile, existsSync } from "node:fs";
import {
  writeFile as writeFileAsync,
  mkdir as mkdirAsync,
} from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Load .env.local (same approach as sync-supabase.ts)
import { existsSync as existsSyncFs, readFileSync } from "node:fs";
const envFile = join(process.cwd(), ".env.local");
if (existsSyncFs(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

import { ingestCleanListings, type IngestStats } from "./scrapers/ingest-clean-listings.js";
import { enrichAll } from "./scrapers/enrich-p6.js";
import { openDb, DEFAULT_DB_PATH } from "./scrapers/db/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Authorized sources (documentation + test guard) ──────────────────────────
// Search Gateway sources (avito via Serper, sarouty, yakeey, agenz,
// logic-immo, mubawab via Serper) are NOT authorized for DB ingestion.
// Only direct scraper sources are authorized.
export const NIGHTLY_AUTHORIZED_SOURCES: ReadonlyArray<string> = [
  "avito",   // public listing pages only (not via Serper)
  "mubawab", // public listing pages only (not via Serper)
  "sarouty", // public listing pages only (not via Serper)
];

export const SEARCH_GATEWAY_SOURCES: ReadonlyArray<string> = [
  "avito_serper",
  "sarouty_serper",
  "yakeey_serper",
  "agenz_serper",
  "logic_immo_serper",
  "mubawab_serper",
  "serper",
  "search_gateway",
];

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NightlyConfig = {
  enabled: boolean;
  max_cycles: number;
  delay_minutes: number;
  stop_on_error_count: number;
  sync_supabase: boolean;
  report_dir: string;
};

export type SpawnResult = {
  success: boolean;
  output: string;
  duration_ms: number;
};

export type NightlyReport = {
  started_at: string;
  finished_at: string;
  cycles_requested: number;
  cycles_completed: number;
  sources_attempted: string[];
  raw_listings_before: number;
  raw_listings_after: number;
  property_listings_before: number;
  property_listings_after: number;
  listing_sources_before: number;
  listing_sources_after: number;
  created: number;
  updated: number;
  duplicates_skipped: number;
  rejected: number;
  errors: number;
  supabase_sync_status: "ok" | "skipped" | "error";
  supabase_before: number;
  supabase_after: number;
};

export type NightlyDeps = {
  scrape: () => Promise<SpawnResult>;
  ingest: () => Promise<{ success: boolean; stats: IngestStats }>;
  enrich: () => Promise<{ success: boolean }>;
  syncSupabase: () => Promise<SpawnResult>;
  getLocalCounts: () => { raw_listings: number; property_listings: number; listing_sources: number };
  getSupabaseCount: () => Promise<number>;
  writeReport: (path: string, report: NightlyReport) => Promise<void>;
  log: (msg: string) => void;
  sleep: (ms: number) => Promise<void>;
};

// ─── Config ────────────────────────────────────────────────────────────────────

export function readNightlyConfig(): NightlyConfig {
  return {
    enabled: process.env.NIGHTLY_INGESTION_ENABLED !== "false",
    max_cycles: Math.max(1, parseInt(process.env.NIGHTLY_MAX_CYCLES ?? "3", 10)),
    delay_minutes: Math.max(0, parseFloat(process.env.NIGHTLY_DELAY_MINUTES ?? "20")),
    stop_on_error_count: Math.max(1, parseInt(process.env.NIGHTLY_STOP_ON_ERROR_COUNT ?? "2", 10)),
    sync_supabase: process.env.NIGHTLY_SYNC_SUPABASE === "true",
    report_dir: process.env.NIGHTLY_REPORT_DIR ?? "data/nightly-reports",
  };
}

// ─── Pure helpers ──────────────────────────────────────────────────────────────

export function shouldStopOnErrors(errorCount: number, stopLimit: number): boolean {
  return errorCount >= stopLimit;
}

export function buildReportPath(reportDir: string, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return join(reportDir, `nightly-ingestion-${y}-${m}-${d}.json`);
}

// ─── Subprocess helper ─────────────────────────────────────────────────────────

export async function spawnTsx(scriptPath: string): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn("npx", ["tsx", scriptPath], {
      shell: true,
      cwd: process.cwd(),
      env: process.env,
    });
    let output = "";
    proc.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      output += s;
      process.stdout.write(s);
    });
    proc.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      output += s;
      process.stderr.write(s);
    });
    proc.on("close", (code: number | null) => {
      resolve({ success: code === 0, output, duration_ms: Date.now() - start });
    });
  });
}

// ─── DB helpers ────────────────────────────────────────────────────────────────

export function getLocalDbCounts(dbPath = DEFAULT_DB_PATH): {
  raw_listings: number;
  property_listings: number;
  listing_sources: number;
} {
  try {
    const db = openDb(dbPath);
    const r = (db.prepare("SELECT COUNT(*) as c FROM raw_listings").get() as { c: number }).c ?? 0;
    const p = (db.prepare("SELECT COUNT(*) as c FROM property_listings").get() as { c: number }).c ?? 0;
    const s = (db.prepare("SELECT COUNT(*) as c FROM listing_sources").get() as { c: number }).c ?? 0;
    db.close();
    return { raw_listings: r, property_listings: p, listing_sources: s };
  } catch {
    return { raw_listings: -1, property_listings: -1, listing_sources: -1 };
  }
}

async function getSupabasePropertyCount(): Promise<number> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return -1;
  try {
    // Dynamic import to avoid hard dependency in test environments
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key);
    const { count } = await sb
      .from("property_listings")
      .select("*", { count: "exact", head: true });
    return count ?? -1;
  } catch {
    return -1;
  }
}

// ─── Default deps (production) ────────────────────────────────────────────────

function buildDefaultDeps(): NightlyDeps {
  const p0Script = join(__dirname, "scrapers/p0-run.ts");
  const syncScript = join(__dirname, "sync-supabase.ts");

  return {
    scrape: () => spawnTsx(p0Script),
    ingest: async () => {
      try {
        const stats = await ingestCleanListings({});
        return { success: true, stats };
      } catch (e) {
        const empty: IngestStats = {
          totalCleanRead: 0,
          insertedRaw: 0,
          insertedProperty: 0,
          updatedProperty: 0,
          insertedSources: 0,
          updatedSources: 0,
          skipped: 0,
          errors: 1,
        };
        return { success: false, stats: empty };
      }
    },
    enrich: async () => {
      try {
        enrichAll();
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    syncSupabase: () => spawnTsx(syncScript),
    getLocalCounts: getLocalDbCounts,
    getSupabaseCount: getSupabasePropertyCount,
    writeReport: async (path, report) => {
      const dir = dirname(path);
      await mkdirAsync(dir, { recursive: true });
      await writeFileAsync(path, JSON.stringify(report, null, 2), "utf8");
    },
    log: (msg: string) => console.log(msg),
    sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
  };
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export async function runNightlyIngestion(
  config?: NightlyConfig,
  deps?: NightlyDeps
): Promise<NightlyReport> {
  const cfg = config ?? readNightlyConfig();
  const d = deps ?? buildDefaultDeps();

  const startedAt = new Date();
  d.log(`[nightly] started — cycles=${cfg.max_cycles} delay=${cfg.delay_minutes}min sync=${cfg.sync_supabase}`);

  if (!cfg.enabled) {
    d.log("[nightly] NIGHTLY_INGESTION_ENABLED=false — skipping");
    const report: NightlyReport = {
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      cycles_requested: cfg.max_cycles,
      cycles_completed: 0,
      sources_attempted: [],
      raw_listings_before: -1,
      raw_listings_after: -1,
      property_listings_before: -1,
      property_listings_after: -1,
      listing_sources_before: -1,
      listing_sources_after: -1,
      created: 0,
      updated: 0,
      duplicates_skipped: 0,
      rejected: 0,
      errors: 0,
      supabase_sync_status: "skipped",
      supabase_before: -1,
      supabase_after: -1,
    };
    return report;
  }

  // Snapshot before
  const before = d.getLocalCounts();
  d.log(`[nightly] db_before — property_listings=${before.property_listings} listing_sources=${before.listing_sources}`);

  let cyclesCompleted = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDuplicates = 0;
  let totalRejected = 0;
  let totalErrors = 0;

  for (let cycle = 1; cycle <= cfg.max_cycles; cycle++) {
    d.log(`[nightly] cycle=${cycle} started`);

    // Step 1: scrape
    const scrapeResult = await d.scrape();
    if (!scrapeResult.success) {
      totalErrors++;
      d.log(`[nightly] cycle=${cycle} scrape=error`);
      if (shouldStopOnErrors(totalErrors, cfg.stop_on_error_count)) {
        d.log(`[nightly] stopping — error_count=${totalErrors} >= stop_limit=${cfg.stop_on_error_count}`);
        break;
      }
      continue; // skip ingest if scrape failed
    }
    d.log(`[nightly] cycle=${cycle} scrape=ok`);

    // Step 2: ingest
    const ingestResult = await d.ingest();
    if (!ingestResult.success) {
      totalErrors++;
      d.log(`[nightly] cycle=${cycle} ingest=error`);
      if (shouldStopOnErrors(totalErrors, cfg.stop_on_error_count)) {
        d.log(`[nightly] stopping — error_count=${totalErrors} >= stop_limit=${cfg.stop_on_error_count}`);
        break;
      }
    } else {
      const s = ingestResult.stats;
      totalCreated += s.insertedProperty;
      totalUpdated += s.updatedProperty;
      totalDuplicates += s.skipped;
      totalRejected += s.errors;
      d.log(`[nightly] cycle=${cycle} ingest=ok created=${s.insertedProperty} updated=${s.updatedProperty} duplicates=${s.skipped}`);
    }

    // Step 3: enrich
    const enrichResult = await d.enrich();
    if (!enrichResult.success) {
      totalErrors++;
      d.log(`[nightly] cycle=${cycle} enrich=error`);
      // Don't stop on enrich failure — it's non-critical
    } else {
      d.log(`[nightly] cycle=${cycle} enrich=ok`);
    }

    cyclesCompleted++;
    d.log(`[nightly] cycle=${cycle} completed`);

    // Wait between cycles (not after last)
    if (cycle < cfg.max_cycles) {
      const delayMs = cfg.delay_minutes * 60 * 1000;
      d.log(`[nightly] waiting ${cfg.delay_minutes} minutes`);
      await d.sleep(delayMs);
    }
  }

  // Snapshot after
  const after = d.getLocalCounts();
  d.log(`[nightly] db_after — property_listings=${after.property_listings} listing_sources=${after.listing_sources}`);

  // Step 4: optional Supabase sync (once, after all cycles)
  let supabaseSyncStatus: "ok" | "skipped" | "error" = "skipped";
  let supabaseBefore = -1;
  let supabaseAfter = -1;

  if (cfg.sync_supabase) {
    supabaseBefore = await d.getSupabaseCount();
    d.log(`[nightly] supabase_before=${supabaseBefore}`);
    const syncResult = await d.syncSupabase();
    if (syncResult.success) {
      supabaseAfter = await d.getSupabaseCount();
      supabaseSyncStatus = "ok";
      d.log(`[nightly] supabase sync=ok after=${supabaseAfter}`);
    } else {
      supabaseSyncStatus = "error";
      totalErrors++;
      d.log(`[nightly] supabase sync=error`);
    }
  } else {
    d.log(`[nightly] supabase sync=skipped (NIGHTLY_SYNC_SUPABASE=false)`);
  }

  const finishedAt = new Date();
  const report: NightlyReport = {
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    cycles_requested: cfg.max_cycles,
    cycles_completed: cyclesCompleted,
    sources_attempted: [...NIGHTLY_AUTHORIZED_SOURCES],
    raw_listings_before: before.raw_listings,
    raw_listings_after: after.raw_listings,
    property_listings_before: before.property_listings,
    property_listings_after: after.property_listings,
    listing_sources_before: before.listing_sources,
    listing_sources_after: after.listing_sources,
    created: totalCreated,
    updated: totalUpdated,
    duplicates_skipped: totalDuplicates,
    rejected: totalRejected,
    errors: totalErrors,
    supabase_sync_status: supabaseSyncStatus,
    supabase_before: supabaseBefore,
    supabase_after: supabaseAfter,
  };

  const reportPath = buildReportPath(cfg.report_dir, startedAt);
  await d.writeReport(reportPath, report);
  d.log(`[nightly] report written to ${reportPath}`);
  d.log(`[nightly] completed — cycles=${cyclesCompleted}/${cfg.max_cycles} errors=${totalErrors}`);

  return report;
}

// ─── CLI entrypoint ────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith("nightly-ingestion-runner.ts") ||
               process.argv[1]?.endsWith("nightly-ingestion-runner.js");

if (isMain) {
  runNightlyIngestion().catch((err) => {
    console.error("[nightly] fatal error:", err.message);
    process.exit(1);
  });
}

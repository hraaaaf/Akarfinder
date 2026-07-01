// Unified DB access layer — routes to SQLite or Supabase based on DATABASE_PROVIDER.
//
// IMPORTANT: db-listings (which imports node:sqlite) is loaded via dynamic import
// so that node:sqlite is never resolved in Supabase mode. This makes the Supabase
// path safe on Vercel even when running Node.js 20 (which lacks node:sqlite).
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  DbListingsQuery,
  DbListingsResult,
  DbStats,
} from "@/lib/listings/db-listings";
import type { DbListingRow } from "@/lib/listings/db-listings";
import {
  querySupabaseListings,
  querySupabaseListingById,
  querySupabaseStats,
} from "./supabase-listings";
import { getDbProvider, isSupabaseConfigured } from "./provider";

export type { DbListingsQuery, DbListingsResult, DbStats, DbListingRow };

const SQLITE_DB_PATH = join(
  process.cwd(),
  "scripts/scrapers/output/akarfinder.db"
);

function useSupabase(): boolean {
  return getDbProvider() === "supabase" && isSupabaseConfigured();
}

// Logs the active DB provider — visible in Vercel Functions logs to diagnose
// silent fallback to SQLite (which returns 0 rows on Vercel where the DB file
// is absent).
function logProvider(via: "supabase" | "sqlite" | "sqlite_fallback") {
  const configured = isSupabaseConfigured();
  const provider = getDbProvider();
  console.log(`[db] provider=${provider} supabase_configured=${configured} via=${via}`);
}

export async function queryListings(
  query: DbListingsQuery = {}
): Promise<DbListingsResult> {
  if (useSupabase()) {
    logProvider("supabase");
    try {
      const result = await querySupabaseListings(query);
      console.log(`[db] supabase returned ${result.listings.length}/${result.total} rows`);
      return result;
    } catch (err) {
      console.error("[db] Supabase query failed, falling back to SQLite:", err);
    }
  } else {
    logProvider("sqlite");
  }
  // Dynamic import: node:sqlite only loaded when this code path executes.
  const { queryDbListings } = await import("@/lib/listings/db-listings");
  return queryDbListings(query);
}

export async function queryStats(): Promise<DbStats> {
  if (useSupabase()) {
    try {
      return await querySupabaseStats();
    } catch (err) {
      console.error("[db] Supabase stats failed, falling back to SQLite:", err);
    }
  }
  const { queryDbStats } = await import("@/lib/listings/db-listings");
  return queryDbStats();
}

export async function queryListingById(
  id: string
): Promise<DbListingRow | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  if (useSupabase()) {
    try {
      return await querySupabaseListingById(numericId);
    } catch (err) {
      console.error("[db] Supabase getById failed, falling back to SQLite:", err);
    }
  }
  const { getDbListingById } = await import("@/lib/listings/db-listings");
  return getDbListingById(id);
}

// Synchronous — safe because in Supabase mode we never touch the file system.
export function isAvailable(): boolean {
  if (getDbProvider() === "supabase") return isSupabaseConfigured();
  return existsSync(SQLITE_DB_PATH);
}

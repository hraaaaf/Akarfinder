// Unified DB access layer — routes to SQLite, Supabase, or Neon based on DATABASE_PROVIDER.
//
// IMPORTANT: provider-specific modules are loaded via dynamic import where practical.
// Neon is fail-closed: once explicitly selected, a missing URL or query failure must
// not silently serve a stale local SQLite snapshot.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  DbListingsQuery,
  DbListingsResult,
  DbStats,
  DbListingRow,
} from "@/lib/listings/db-listings";
import {
  querySupabaseListings,
  querySupabaseListingById,
  querySupabaseStats,
} from "./supabase-listings";
import {
  getDbProvider,
  isNeonConfigured,
  isSupabaseConfigured,
} from "./provider";

export type { DbListingsQuery, DbListingsResult, DbStats, DbListingRow };

const SQLITE_DB_PATH = join(
  process.cwd(),
  "scripts/scrapers/output/akarfinder.db"
);

function useSupabase(): boolean {
  return getDbProvider() === "supabase" && isSupabaseConfigured();
}

function assertNeonConfigured(): void {
  if (!isNeonConfigured()) {
    throw new Error(
      "[db] DATABASE_PROVIDER=neon requires NEON_DATABASE_URL",
    );
  }
}

function logProvider(
  via: "neon" | "supabase" | "sqlite" | "sqlite_fallback",
): void {
  const provider = getDbProvider();
  console.log(
    `[db] provider=${provider} neon_configured=${isNeonConfigured()} supabase_configured=${isSupabaseConfigured()} via=${via}`,
  );
}

export async function queryListings(
  query: DbListingsQuery = {}
): Promise<DbListingsResult> {
  if (getDbProvider() === "neon") {
    assertNeonConfigured();
    logProvider("neon");
    const { queryNeonListings } = await import("./neon-listings");
    try {
      const result = await queryNeonListings(query);
      console.log(
        `[db] neon returned ${result.listings.length}/${result.total} rows`,
      );
      return result;
    } catch (err) {
      console.error("[db] Neon query failed; refusing stale SQLite fallback:", err);
      throw err;
    }
  }

  if (useSupabase()) {
    logProvider("supabase");
    try {
      const result = await querySupabaseListings(query);
      console.log(
        `[db] supabase returned ${result.listings.length}/${result.total} rows`,
      );
      return result;
    } catch (err) {
      console.error("[db] Supabase query failed, falling back to SQLite:", err);
    }
  } else {
    logProvider("sqlite");
  }

  const { queryDbListings } = await import("@/lib/listings/db-listings");
  return queryDbListings(query);
}

export async function queryStats(): Promise<DbStats> {
  if (getDbProvider() === "neon") {
    assertNeonConfigured();
    const { queryNeonStats } = await import("./neon-listings");
    try {
      return await queryNeonStats();
    } catch (err) {
      console.error("[db] Neon stats failed; refusing stale SQLite fallback:", err);
      throw err;
    }
  }

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

  if (getDbProvider() === "neon") {
    assertNeonConfigured();
    const { queryNeonListingById } = await import("./neon-listings");
    try {
      return await queryNeonListingById(numericId);
    } catch (err) {
      console.error(
        "[db] Neon getById failed; refusing stale SQLite fallback:",
        err,
      );
      throw err;
    }
  }

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

export function isAvailable(): boolean {
  const provider = getDbProvider();
  if (provider === "neon") return isNeonConfigured();
  if (provider === "supabase") return isSupabaseConfigured();
  return existsSync(SQLITE_DB_PATH);
}

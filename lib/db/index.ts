// Unified DB access layer with explicit primary -> backup failover.
// Production must declare both DATABASE_PROVIDER and, when desired,
// DATABASE_BACKUP_PROVIDER. We never silently reinterpret an operational
// provider failure as an empty database.
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
  getDbProviderChain,
  isSupabaseConfigured,
  isNeonConfigured,
  type DbProvider,
} from "./provider";
import {
  queryNeonListings,
  queryNeonListingById,
  queryNeonStats,
} from "./neon-listings";

export type { DbListingsQuery, DbListingsResult, DbStats, DbListingRow };

const SQLITE_DB_PATH = join(
  process.cwd(),
  "scripts/scrapers/output/akarfinder.db"
);

function providerConfigured(provider: DbProvider): boolean {
  if (provider === "neon") return isNeonConfigured();
  if (provider === "supabase") return isSupabaseConfigured();
  return existsSync(SQLITE_DB_PATH);
}

function logAttempt(provider: DbProvider, role: "primary" | "backup") {
  console.log(
    `[db] role=${role} provider=${provider} configured=${providerConfigured(provider)}`
  );
}

async function sqliteListings(query: DbListingsQuery) {
  const { queryDbListings } = await import("@/lib/listings/db-listings");
  return queryDbListings(query);
}

async function sqliteStats() {
  const { queryDbStats } = await import("@/lib/listings/db-listings");
  return queryDbStats();
}

async function sqliteListingById(id: string) {
  const { getDbListingById } = await import("@/lib/listings/db-listings");
  return getDbListingById(id);
}

export async function queryListings(
  query: DbListingsQuery = {}
): Promise<DbListingsResult> {
  const chain = getDbProviderChain();
  let lastError: unknown = null;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const role = i === 0 ? "primary" : "backup";
    logAttempt(provider, role);

    if (!providerConfigured(provider)) {
      lastError = new Error(`[db] ${provider} is not configured`);
      console.error(lastError);
      continue;
    }

    try {
      if (provider === "neon") return await queryNeonListings(query);
      if (provider === "supabase") return await querySupabaseListings(query);
      return await sqliteListings(query);
    } catch (error) {
      lastError = error;
      console.error(`[db] ${provider} listings failed; trying next provider`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("[db] no configured listing provider available");
}

export async function queryStats(): Promise<DbStats> {
  const chain = getDbProviderChain();
  let lastError: unknown = null;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const role = i === 0 ? "primary" : "backup";
    logAttempt(provider, role);

    if (!providerConfigured(provider)) {
      lastError = new Error(`[db] ${provider} is not configured`);
      console.error(lastError);
      continue;
    }

    try {
      if (provider === "neon") return await queryNeonStats();
      if (provider === "supabase") return await querySupabaseStats();
      return await sqliteStats();
    } catch (error) {
      lastError = error;
      console.error(`[db] ${provider} stats failed; trying next provider`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("[db] no configured stats provider available");
}

export async function queryListingById(
  id: string
): Promise<DbListingRow | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const chain = getDbProviderChain();
  let lastError: unknown = null;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const role = i === 0 ? "primary" : "backup";
    logAttempt(provider, role);

    if (!providerConfigured(provider)) {
      lastError = new Error(`[db] ${provider} is not configured`);
      console.error(lastError);
      continue;
    }

    try {
      if (provider === "neon") return await queryNeonListingById(numericId);
      if (provider === "supabase") return await querySupabaseListingById(numericId);
      return await sqliteListingById(id);
    } catch (error) {
      lastError = error;
      console.error(`[db] ${provider} getById failed; trying next provider`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("[db] no configured detail provider available");
}

export function isAvailable(): boolean {
  return getDbProviderChain().some(providerConfigured);
}

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { computeAgeSeconds, isFreshEntry, isStaleEligibleEntry } from "./cache-store";
import { NoopSearchGatewayCacheStore } from "./noop-cache-store";
import type {
  SearchGatewayCacheEntry,
  SearchGatewayCacheLookupResult,
  SearchGatewayCacheStore,
} from "./types";

type SupabaseLikeTable = {
  select(columns: string): SupabaseLikeTable;
  eq(column: string, value: string): SupabaseLikeTable;
  maybeSingle(): Promise<{ data: SearchGatewayCacheEntry | null; error: { code?: string; message?: string } | null }>;
  upsert(value: SearchGatewayCacheEntry): Promise<{ error: { code?: string; message?: string } | null }>;
  update(value: Partial<SearchGatewayCacheEntry>): SupabaseLikeTable;
};

type SupabaseLikeClient = {
  from(table: string): SupabaseLikeTable;
};

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    message.includes("search_gateway_cache") &&
    (message.includes("does not exist") ||
      message.includes("not found") ||
      message.includes("42p01") ||
      message.includes("schema cache"))
  );
}

async function safeMaybeSingle(
  client: SupabaseLikeClient,
  table: string,
  cacheKey: string,
): Promise<{ data: SearchGatewayCacheEntry | null; error: { code?: string; message?: string } | null }> {
  return client.from(table).select("*").eq("cache_key", cacheKey).maybeSingle();
}

export class SupabaseSearchGatewayCacheStore implements SearchGatewayCacheStore {
  private readonly client: SupabaseLikeClient;
  private readonly tableName: string;

  constructor(options?: { client?: SupabaseLikeClient; tableName?: string }) {
    this.client = options?.client ?? (getSupabaseServerClient() as unknown as SupabaseLikeClient);
    this.tableName = options?.tableName ?? "search_gateway_cache";
  }

  async readFresh(cacheKey: string, now = new Date()): Promise<SearchGatewayCacheLookupResult> {
    try {
      const { data, error } = await safeMaybeSingle(this.client, this.tableName, cacheKey);
      if (error) {
        if (isMissingTableError(error)) return { status: "bypass", reason: "table_missing" };
        return { status: "error", reason: error.message ?? "cache_read_failed" };
      }
      if (!data) return { status: "miss" };
      if (!isFreshEntry(data, now)) return { status: "miss" };
      return {
        status: "hit",
        entry: data,
        age_seconds: computeAgeSeconds(data.created_at, now),
      };
    } catch (error) {
      return {
        status: "error",
        reason: error instanceof Error ? error.message : "cache_read_failed",
      };
    }
  }

  async readStale(cacheKey: string, now = new Date()): Promise<SearchGatewayCacheLookupResult> {
    try {
      const { data, error } = await safeMaybeSingle(this.client, this.tableName, cacheKey);
      if (error) {
        if (isMissingTableError(error)) return { status: "bypass", reason: "table_missing" };
        return { status: "error", reason: error.message ?? "cache_read_failed" };
      }
      if (!data) return { status: "miss" };
      if (!isStaleEligibleEntry(data, now)) return { status: "miss" };
      return {
        status: "stale",
        entry: data,
        age_seconds: computeAgeSeconds(data.created_at, now),
      };
    } catch (error) {
      return {
        status: "error",
        reason: error instanceof Error ? error.message : "cache_read_failed",
      };
    }
  }

  async write(entry: SearchGatewayCacheEntry): Promise<void> {
    try {
      const { error } = await this.client.from(this.tableName).upsert(entry);
      if (error && !isMissingTableError(error)) {
        console.error("[search-gateway-cache] write failed:", error.message);
      }
    } catch (error) {
      console.error("[search-gateway-cache] write exception:", error);
    }
  }

  async recordHit(entry: SearchGatewayCacheEntry, hitAt = new Date()): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({
          last_hit_at: hitAt.toISOString(),
          hit_count: (entry.hit_count ?? 0) + 1,
        })
        .eq("cache_key", entry.cache_key)
        .maybeSingle();
      if (error && !isMissingTableError(error)) {
        console.error("[search-gateway-cache] recordHit failed:", error.message);
      }
    } catch (error) {
      console.error("[search-gateway-cache] recordHit exception:", error);
    }
  }
}

export function createSearchGatewayCacheStore(): SearchGatewayCacheStore {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new NoopSearchGatewayCacheStore("supabase_not_configured");
    }
    return new SupabaseSearchGatewayCacheStore();
  } catch {
    return new NoopSearchGatewayCacheStore("supabase_not_configured");
  }
}

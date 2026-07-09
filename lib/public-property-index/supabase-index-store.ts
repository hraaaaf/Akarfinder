import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { searchPublicPropertyIndex } from "./fts-search";
import { normalizePublicPropertyIndexRecord } from "./normalize-index-record";
import { NoopPublicPropertyIndexStore } from "./noop-index-store";
import { normalizePublicPropertyIndexSearchQuery } from "./search-query";
import type {
  PublicPropertyIndexRecord,
  PublicPropertyIndexSearchQuery,
  PublicPropertyIndexStore,
} from "./types";

type SupabaseLikeTable = {
  select(columns: string): SupabaseLikeTable;
  textSearch(column: string, query: string, options?: { config?: string; type?: string }): SupabaseLikeTable;
  ilike(column: string, pattern: string): SupabaseLikeTable;
  order(column: string, options?: { ascending?: boolean }): SupabaseLikeTable;
  limit(count: number): SupabaseLikeTable;
  eq(column: string, value: string): SupabaseLikeTable;
  maybeSingle(): Promise<{ data: PublicPropertyIndexRecord | null; error: { code?: string; message?: string } | null }>;
  insert(values: PublicPropertyIndexRecord[] | PublicPropertyIndexRecord): SupabaseLikeTable;
  upsert(values: PublicPropertyIndexRecord[] | PublicPropertyIndexRecord, options?: { onConflict?: string }): SupabaseLikeTable;
};

type SupabaseLikeClient = {
  from(table: string): SupabaseLikeTable;
};

type SupabaseSearchResult = {
  data: PublicPropertyIndexRecord[] | null;
  error: { code?: string; message?: string } | null;
};

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    message.includes("public_property_index") &&
    (message.includes("does not exist") || message.includes("not found") || message.includes("42p01") || message.includes("schema cache"))
  );
}

function isSupabaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export class SupabasePublicPropertyIndexStore implements PublicPropertyIndexStore {
  private readonly client: SupabaseLikeClient;
  private readonly tableName: string;

  constructor(options?: { client?: SupabaseLikeClient; tableName?: string }) {
    this.client = options?.client ?? (getSupabaseServerClient() as unknown as SupabaseLikeClient);
    this.tableName = options?.tableName ?? "public_property_index";
  }

  async search(query: PublicPropertyIndexSearchQuery): Promise<PublicPropertyIndexRecord[]> {
    const normalized = normalizePublicPropertyIndexSearchQuery(query);
    const limit = normalized.limit;

    try {
      let dbQuery = this.client
        .from(this.tableName)
        .select("*")
        .order("observed_at", { ascending: false })
        .limit(Math.min(limit * 10, 500));

      if (normalized.q) {
        dbQuery = dbQuery.textSearch("fts_vector", normalized.q, { config: "french", type: "websearch" });
      }
      if (normalized.city) {
        dbQuery = dbQuery.ilike("inferred_city", `%${normalized.city}%`);
      }
      if (normalized.neighborhood) {
        dbQuery = dbQuery.ilike("inferred_neighborhood", `%${normalized.neighborhood}%`);
      }
      if (normalized.property_type) {
        dbQuery = dbQuery.ilike("inferred_property_type", `%${normalized.property_type}%`);
      }
      if (normalized.transaction_type) {
        dbQuery = dbQuery.ilike("inferred_transaction_type", `%${normalized.transaction_type}%`);
      }

      const result = (await dbQuery) as unknown as SupabaseSearchResult;
      if (result?.error) {
        if (isMissingTableError(result.error)) return [];
        console.error("[public-property-index] search failed:", result.error.message);
        return [];
      }

      const rows = Array.isArray(result?.data)
        ? result.data.map((row) =>
            normalizePublicPropertyIndexRecord({
              id: row.id,
              source_host: row.source_host,
              source_url: row.source_url,
              title: row.title,
              short_snippet: row.short_snippet,
              inferred_city: row.inferred_city,
              inferred_neighborhood: row.inferred_neighborhood,
              inferred_property_type: row.inferred_property_type,
              inferred_transaction_type: row.inferred_transaction_type,
              public_price: row.public_price,
              public_surface: row.public_surface,
              result_source: row.result_source,
              provider_engine: row.provider_engine,
              observed_at: row.observed_at,
              created_at: row.created_at,
              updated_at: row.updated_at,
              observation_count: row.observation_count,
            }),
          )
        : [];

      return searchPublicPropertyIndex(rows, normalized);
    } catch (error) {
      if (error instanceof Error && isMissingTableError({ message: error.message })) {
        return [];
      }
      console.error("[public-property-index] search exception:", error);
      return [];
    }
  }

  async upsert(records: PublicPropertyIndexRecord[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      const mergedRecords: PublicPropertyIndexRecord[] = [];

      for (const record of records) {
        const existing = await this.client
          .from(this.tableName)
          .select("*")
          .eq("source_url", record.source_url)
          .maybeSingle();

        if (existing.error) {
          if (isMissingTableError(existing.error)) return;
          console.error("[public-property-index] lookup before upsert failed:", existing.error.message);
          return;
        }

        const merged: PublicPropertyIndexRecord = normalizePublicPropertyIndexRecord({
          ...record,
          observation_count: (existing.data?.observation_count ?? 0) + Math.max(1, record.observation_count ?? 1),
          updated_at: now,
          created_at: existing.data?.created_at ?? record.created_at ?? now,
        });

        mergedRecords.push(merged);
      }

      const upsertResult = (await this.client
        .from(this.tableName)
        .upsert(mergedRecords, { onConflict: "source_url" })) as unknown as {
        error: { code?: string; message?: string } | null;
      };
      const { error } = upsertResult;
      if (error && !isMissingTableError(error)) {
        console.error("[public-property-index] upsert failed:", error.message);
      }
    } catch (error) {
      if (error instanceof Error && isMissingTableError({ message: error.message })) return;
      console.error("[public-property-index] upsert exception:", error);
    }
  }
}

class InMemoryPublicPropertyIndexStore implements PublicPropertyIndexStore {
  constructor(private readonly records: PublicPropertyIndexRecord[]) {}

  async search(query: PublicPropertyIndexSearchQuery): Promise<PublicPropertyIndexRecord[]> {
    return searchPublicPropertyIndex(this.records, query);
  }

  async upsert(records: PublicPropertyIndexRecord[]): Promise<void> {
    this.records.push(...records);
  }
}

export function createPublicPropertyIndexStore(options?: {
  env?: NodeJS.ProcessEnv;
  seedRecords?: PublicPropertyIndexRecord[];
}): PublicPropertyIndexStore {
  const env = options?.env ?? process.env;
  if (env.PUBLIC_INDEX_POC_ENABLED !== "true") {
    return new NoopPublicPropertyIndexStore("public_index_disabled");
  }

  const seedRecords = options?.seedRecords ?? [];
  const fixtureMode = env.PUBLIC_INDEX_POC_USE_FIXTURES === "true" || !isSupabaseConfigured(env);
  if (fixtureMode && seedRecords.length > 0) {
    return new InMemoryPublicPropertyIndexStore([...seedRecords]);
  }

  if (!isSupabaseConfigured(env)) {
    return new NoopPublicPropertyIndexStore("supabase_not_configured");
  }

  return new SupabasePublicPropertyIndexStore();
}

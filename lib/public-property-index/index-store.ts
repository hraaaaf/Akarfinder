import { PUBLIC_PROPERTY_INDEX_FIXTURES } from "./public-index-fixtures";
import { searchPublicPropertyIndex } from "./fts-search";
import { NoopPublicPropertyIndexStore } from "./noop-index-store";
import { SupabasePublicPropertyIndexStore } from "./supabase-index-store";
import type { PublicPropertyIndexRecord, PublicPropertyIndexSearchQuery, PublicPropertyIndexStore } from "./types";

class InMemoryPublicPropertyIndexStore implements PublicPropertyIndexStore {
  constructor(private readonly records: PublicPropertyIndexRecord[]) {}

  async search(query: PublicPropertyIndexSearchQuery): Promise<PublicPropertyIndexRecord[]> {
    return searchPublicPropertyIndex(this.records, query);
  }

  async upsert(records: PublicPropertyIndexRecord[]): Promise<void> {
    this.records.push(...records);
  }
}

function isSupabaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createPublicPropertyIndexStore(options?: {
  env?: NodeJS.ProcessEnv;
  seedRecords?: PublicPropertyIndexRecord[];
}): PublicPropertyIndexStore {
  const env = options?.env ?? process.env;
  if (env.PUBLIC_INDEX_POC_ENABLED !== "true") {
    return new NoopPublicPropertyIndexStore("public_index_disabled");
  }

  const seedRecords = options?.seedRecords ?? PUBLIC_PROPERTY_INDEX_FIXTURES;
  if (env.PUBLIC_INDEX_POC_USE_FIXTURES === "true" || !isSupabaseConfigured(env)) {
    return new InMemoryPublicPropertyIndexStore([...seedRecords]);
  }

  return new SupabasePublicPropertyIndexStore();
}

export { NoopPublicPropertyIndexStore } from "./noop-index-store";
export { SupabasePublicPropertyIndexStore } from "./supabase-index-store";
export { PUBLIC_PROPERTY_INDEX_FIXTURES } from "./public-index-fixtures";

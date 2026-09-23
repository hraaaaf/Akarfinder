import { getDbProvider } from "@/lib/db/provider";
import { neonExecutor, type NeonQueryExecutor } from "@/lib/db/neon-client";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const CHUNK_SIZE = 100;

type SupportedIdTable =
  | "geo_resolution_events"
  | "thin_index_search_documents"
  | "source_offer_seeds";

type SupportedIdKey = "source_record_id" | "seed_id" | "id";

function chunks<T>(values: readonly T[], size = CHUNK_SIZE): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size) as T[]);
  }
  return output;
}

function errorDetails(error: any): string {
  return JSON.stringify({
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
  });
}

function assertIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`unsafe SQL identifier: ${value}`);
  }
  return value;
}

export async function readMarketRowsByIds(
  table: SupportedIdTable,
  select: string,
  key: SupportedIdKey,
  ids: readonly string[],
  options: { env?: NodeJS.ProcessEnv; executor?: NeonQueryExecutor } = {},
): Promise<any[]> {
  if (!ids.length) return [];
  const env = options.env ?? process.env;

  if (getDbProvider(env) === "neon") {
    const executor = options.executor ?? neonExecutor;
    const tableName = assertIdentifier(table);
    const keyName = assertIdentifier(key);
    const columns = select
      .split(",")
      .map((value) => assertIdentifier(value.trim()))
      .join(", ");
    const rows: any[] = [];
    for (const batch of chunks(ids)) {
      const sql = `SELECT ${columns} FROM public.${tableName} WHERE ${keyName} = ANY($1::text[])`;
      rows.push(...await executor.query<any>(sql, [batch]));
    }
    return rows;
  }

  const db: any = getSupabaseServerClient();
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in(key, batch);
    if (error) throw new Error(`market intelligence ${table} bounded read failed: ${errorDetails(error)}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

export async function readValidatedCityRows(
  citySlug: string,
  options: { env?: NodeJS.ProcessEnv; executor?: NeonQueryExecutor } = {},
): Promise<any[]> {
  const env = options.env ?? process.env;
  if (getDbProvider(env) === "neon") {
    return (options.executor ?? neonExecutor).query<any>(
      `SELECT id, slug, entity_type, validation_status
       FROM public.geo_entities
       WHERE entity_type = 'city'
         AND slug = $1
         AND validation_status = 'validated'
       LIMIT 2`,
      [citySlug],
    );
  }

  const db: any = getSupabaseServerClient();
  const { data, error } = await db
    .from("geo_entities")
    .select("id,slug,entity_type,validation_status")
    .eq("entity_type", "city")
    .eq("slug", citySlug)
    .eq("validation_status", "validated")
    .limit(2);
  if (error) throw new Error(`market intelligence city read failed: ${errorDetails(error)}`);
  return data ?? [];
}

export async function readValidatedNeighborhoodRows(
  parentId: string,
  slugs: readonly string[],
  options: { env?: NodeJS.ProcessEnv; executor?: NeonQueryExecutor } = {},
): Promise<any[]> {
  if (!slugs.length) return [];
  const env = options.env ?? process.env;

  if (getDbProvider(env) === "neon") {
    return (options.executor ?? neonExecutor).query<any>(
      `SELECT id, slug, parent_id, entity_type, validation_status
       FROM public.geo_entities
       WHERE entity_type = 'neighborhood'
         AND parent_id = $1::uuid
         AND validation_status = 'validated'
         AND slug = ANY($2::text[])`,
      [parentId, [...slugs]],
    );
  }

  const db: any = getSupabaseServerClient();
  const { data, error } = await db
    .from("geo_entities")
    .select("id,slug,parent_id,entity_type,validation_status")
    .eq("entity_type", "neighborhood")
    .eq("parent_id", parentId)
    .eq("validation_status", "validated")
    .in("slug", [...slugs]);
  if (error) throw new Error(`market intelligence neighborhood read failed: ${errorDetails(error)}`);
  return data ?? [];
}

export async function readResolvedNeighborhoodEvents(
  neighborhoodIds: readonly string[],
  maxRows: number,
  options: { env?: NodeJS.ProcessEnv; executor?: NeonQueryExecutor } = {},
): Promise<any[]> {
  if (!neighborhoodIds.length) return [];
  const env = options.env ?? process.env;
  const bounded = Math.max(1, Math.trunc(maxRows));

  if (getDbProvider(env) === "neon") {
    return (options.executor ?? neonExecutor).query<any>(
      `SELECT id, source_record_type, source_record_id, resolution_status,
              resolved_city_id, resolved_neighborhood_id, created_at
       FROM public.geo_resolution_events
       WHERE source_record_type = 'source_offer_seed'
         AND resolution_status = 'resolved'
         AND resolved_neighborhood_id = ANY($1::uuid[])
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [[...neighborhoodIds], bounded],
    );
  }

  const db: any = getSupabaseServerClient();
  const { data, error } = await db
    .from("geo_resolution_events")
    .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at")
    .eq("source_record_type", "source_offer_seed")
    .eq("resolution_status", "resolved")
    .in("resolved_neighborhood_id", [...neighborhoodIds])
    .range(0, bounded - 1);
  if (error) throw new Error(`market intelligence resolution event read failed: ${errorDetails(error)}`);
  return data ?? [];
}

import { neonExecutor, type NeonQueryExecutor } from "@/lib/db/neon-client";

export type NeonOwnerListingSearchInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  limit?: number;
};

export type NeonOwnerSearchRow = {
  representation_id: string;
  title: string;
  snippet: string;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  quality_tier: string;
  quality_score: number;
  display_eligibility: string;
  display_eligibility_reason: string | null;
  ranking_quality_boost: number;
  updated_at: string;
  total_count: number;
};

function bounded(value?: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const SQL = `
with eligible as (
  select r.*
  from public.owner_listing_representations r
  where r.lifecycle_status = 'live'
    and r.freshness_status = 'fresh_confirmed'
    and r.display_eligibility in ('eligible_primary','eligible_secondary')
    and ($2::text is null or lower(r.normalized_city) = lower(trim($2::text)))
    and ($3::text is null or lower(r.normalized_property_type) = lower(trim($3::text)))
    and ($4::text is null or lower(r.normalized_intent) = lower(trim($4::text)))
    and ($5::numeric is null or r.normalized_price_mad >= $5::numeric)
    and ($6::numeric is null or r.normalized_price_mad <= $6::numeric)
    and ($7::numeric is null or r.normalized_surface_m2 >= $7::numeric)
    and ($8::numeric is null or r.normalized_surface_m2 <= $8::numeric)
    and (
      $1::text is null
      or concat_ws(
        ' ',
        r.normalized_city,
        r.normalized_neighborhood,
        r.normalized_property_type,
        r.condition_label
      ) ilike '%' || trim($1::text) || '%'
    )
)
select
  e.id as representation_id,
  concat_ws(
    ' · ',
    initcap(coalesce(e.normalized_property_type, 'Bien')),
    coalesce(e.normalized_neighborhood, e.normalized_city)
  ) as title,
  'Annonce structurée, vérifiée puis publiée par son propriétaire.'::text as snippet,
  e.normalized_city,
  e.normalized_property_type,
  e.normalized_intent,
  e.normalized_price_mad,
  e.normalized_surface_m2,
  e.price_per_m2_mad,
  e.quality_tier,
  e.quality_score,
  e.display_eligibility,
  e.display_eligibility_reason,
  e.ranking_quality_boost,
  e.updated_at,
  count(*) over() as total_count
from eligible e
order by
  case e.display_eligibility when 'eligible_primary' then 0 else 1 end,
  e.quality_score desc,
  e.updated_at desc,
  e.id
limit greatest(1, least($9::integer, 100))
`;

export async function queryNeonOwnerListings(
  input: NeonOwnerListingSearchInput,
  executor: NeonQueryExecutor = neonExecutor,
): Promise<NeonOwnerSearchRow[]> {
  const rows = await executor.query<NeonOwnerSearchRow>(SQL, [
    input.q?.trim() || null,
    input.city?.trim() || null,
    input.propertyType?.trim() || null,
    input.intent?.trim() || null,
    bounded(input.minPrice),
    bounded(input.maxPrice),
    bounded(input.minSurface),
    bounded(input.maxSurface),
    Math.max(1, Math.min(Math.trunc(input.limit ?? 20), 50)),
  ]);

  return rows.map((row) => ({
    ...row,
    normalized_price_mad: row.normalized_price_mad == null ? null : asNumber(row.normalized_price_mad),
    normalized_surface_m2: row.normalized_surface_m2 == null ? null : asNumber(row.normalized_surface_m2),
    price_per_m2_mad: row.price_per_m2_mad == null ? null : asNumber(row.price_per_m2_mad),
    quality_score: asNumber(row.quality_score),
    ranking_quality_boost: asNumber(row.ranking_quality_boost),
    total_count: asNumber(row.total_count),
  }));
}

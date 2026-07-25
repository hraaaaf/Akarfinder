#!/usr/bin/env tsx
// P0 DATA M2 — generate factual, internal neighborhood profiles from observed listings.
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

const SQL = `
with normalized as (
  select p.*,
    trim(regexp_replace(lower(translate(coalesce(p.city,''),'àáâäãåçèéêëìíîïñòóôöõùúûüÿœæ','aaaaaaceeeeiiiinooooouuuuyoa')), '[^a-z0-9]+', ' ', 'g')) as city_norm,
    trim(regexp_replace(lower(translate(coalesce(p.district,''),'àáâäãåçèéêëìíîïñòóôöõùúûüÿœæ','aaaaaaceeeeiiiinooooouuuuyoa')), '[^a-z0-9]+', ' ', 'g')) as district_norm
  from public.property_listings p
), mapped as (
  select n.*, g.id as neighborhood_id, g.canonical_name as neighborhood_name
  from normalized n
  join public.geo_aliases ca on ca.normalized_alias=n.city_norm
  join public.geo_entities c on c.id=ca.geo_entity_id and c.entity_type='city'
  join public.geo_aliases ga on ga.normalized_alias=n.district_norm
  join public.geo_entities g on g.id=ga.geo_entity_id and g.entity_type='neighborhood' and g.parent_id=c.id
), property_counts as (
  select neighborhood_id, property_type, count(*)::int as property_count
  from mapped where property_type is not null group by neighborhood_id, property_type
), agg as (
  select m.neighborhood_id, max(m.neighborhood_name) as neighborhood_name,
    count(*)::int as evidence_count,
    count(*) filter (where m.surface_m2 is not null and m.surface_m2 > 0)::int as surface_count,
    count(*) filter (where m.images_count is not null and m.images_count > 0)::int as image_count,
    count(*) filter (where m.description_snippet is not null and length(trim(m.description_snippet)) >= 40)::int as description_count,
    coalesce((select jsonb_object_agg(pc.property_type, pc.property_count order by pc.property_type) from property_counts pc where pc.neighborhood_id=m.neighborhood_id),'{}'::jsonb) as property_mix,
    jsonb_build_object(
      'pool_share', round(avg(case when m.has_pool then 1 else 0 end)::numeric,4),
      'concierge_share', round(avg(case when m.has_concierge then 1 else 0 end)::numeric,4),
      'equipped_kitchen_share', round(avg(case when m.has_equipped_kitchen then 1 else 0 end)::numeric,4),
      'garage_share', round(avg(case when coalesce(m.garage_spaces,0)>0 then 1 else 0 end)::numeric,4),
      'terrace_share', round(avg(case when coalesce(m.terrace_m2,0)>0 then 1 else 0 end)::numeric,4),
      'garden_share', round(avg(case when coalesce(m.garden_m2,0)>0 then 1 else 0 end)::numeric,4),
      'signal_scope','listing_observations'
    ) as amenities
  from mapped m group by m.neighborhood_id
), prepared as (
  select *, least(0.85, round(
    (least(evidence_count,40)::numeric/40 * 0.55)
    + (surface_count::numeric/nullif(evidence_count,0) * 0.20)
    + (image_count::numeric/nullif(evidence_count,0) * 0.10)
    + (description_count::numeric/nullif(evidence_count,0) * 0.15), 4)) as confidence_score
  from agg where evidence_count >= 5
)
insert into public.neighborhood_intelligence_profiles (
  neighborhood_id, profile_version, status, summary_fr, lifestyle_tags,
  property_type_mix, amenity_signals, mobility_signals, market_signals,
  evidence_count, confidence, methodology_version
)
select neighborhood_id, 1, 'draft',
  neighborhood_name || ' : profil interne fondé sur ' || evidence_count || ' annonces observées. Il décrit la composition des biens et les équipements déclarés ; aucun signal de mobilité ou de proximité n’est encore certifié.',
  array[]::text[], property_mix, amenities,
  jsonb_build_object('status','unavailable','reason','no_certified_mobility_dataset'),
  jsonb_build_object(
    'listing_count', evidence_count,
    'surface_coverage', round(surface_count::numeric/nullif(evidence_count,0),4),
    'image_coverage', round(image_count::numeric/nullif(evidence_count,0),4),
    'description_coverage', round(description_count::numeric/nullif(evidence_count,0),4),
    'scope','observed_listings_not_transactions'
  ), evidence_count, confidence_score, 'm2_listing_signals_v1'
from prepared
on conflict (neighborhood_id, profile_version) do update set
  status='draft', summary_fr=excluded.summary_fr, lifestyle_tags=excluded.lifestyle_tags,
  property_type_mix=excluded.property_type_mix, amenity_signals=excluded.amenity_signals,
  mobility_signals=excluded.mobility_signals, market_signals=excluded.market_signals,
  evidence_count=excluded.evidence_count, confidence=excluded.confidence,
  methodology_version=excluded.methodology_version, generated_at=now();`;

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.rpc("exec_sql", { sql: SQL });
  if (error) throw new Error(`exec_sql RPC unavailable: ${error.message}. Run the documented SQL through Supabase MCP/CLI instead.`);
  console.log(JSON.stringify({ status: "ok", methodology: "m2_listing_signals_v1" }));
}

main().catch((error) => {
  console.error("[p0-data-generate-neighborhood-intelligence]", error);
  process.exit(1);
});
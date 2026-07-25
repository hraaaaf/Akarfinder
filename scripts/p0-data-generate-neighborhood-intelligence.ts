#!/usr/bin/env tsx
// P0 DATA M2 — generate factual, internal neighborhood profiles from observed listings.
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";
import { normalizeGeoText } from "@/lib/geo/geo-entity-registry";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

type Listing = {
  city: string | null; district: string | null; property_type: string | null;
  surface_m2: number | null; images_count: number | null; description_snippet: string | null;
  has_pool: boolean | null; has_concierge: boolean | null; has_equipped_kitchen: boolean | null;
  garage_spaces: number | null; terrace_m2: number | null; garden_m2: number | null;
};
type Entity = { id: string; entity_type: "city" | "neighborhood"; parent_id: string | null; canonical_name: string };
type Alias = { geo_entity_id: string; normalized_alias: string };
type Bucket = { entity: Entity; listings: Listing[] };

const share = (items: Listing[], predicate: (row: Listing) => boolean) =>
  Number((items.filter(predicate).length / items.length).toFixed(4));

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: listings, error: listingsError }, { data: entities, error: entitiesError }, { data: aliases, error: aliasesError }] = await Promise.all([
    supabase.from("property_listings").select("city,district,property_type,surface_m2,images_count,description_snippet,has_pool,has_concierge,has_equipped_kitchen,garage_spaces,terrace_m2,garden_m2"),
    supabase.from("geo_entities").select("id,entity_type,parent_id,canonical_name"),
    supabase.from("geo_aliases").select("geo_entity_id,normalized_alias"),
  ]);
  if (listingsError || entitiesError || aliasesError) throw listingsError ?? entitiesError ?? aliasesError;

  const entityById = new Map((entities as Entity[]).map((entity) => [entity.id, entity]));
  const idsByAlias = new Map<string, string[]>();
  for (const alias of aliases as Alias[]) idsByAlias.set(alias.normalized_alias, [...(idsByAlias.get(alias.normalized_alias) ?? []), alias.geo_entity_id]);

  const buckets = new Map<string, Bucket>();
  for (const listing of listings as Listing[]) {
    const cityIds = (idsByAlias.get(normalizeGeoText(listing.city ?? "")) ?? []).filter((id) => entityById.get(id)?.entity_type === "city");
    const districtIds = idsByAlias.get(normalizeGeoText(listing.district ?? "")) ?? [];
    const neighborhood = districtIds.map((id) => entityById.get(id)).find((entity) => entity?.entity_type === "neighborhood" && cityIds.includes(entity.parent_id ?? ""));
    if (!neighborhood) continue;
    const bucket = buckets.get(neighborhood.id) ?? { entity: neighborhood, listings: [] };
    bucket.listings.push(listing);
    buckets.set(neighborhood.id, bucket);
  }

  const rows = [...buckets.values()].filter(({ listings }) => listings.length >= 5).map(({ entity, listings }) => {
    const propertyMix: Record<string, number> = {};
    for (const listing of listings) if (listing.property_type) propertyMix[listing.property_type] = (propertyMix[listing.property_type] ?? 0) + 1;
    const surfaceCoverage = share(listings, (row) => (row.surface_m2 ?? 0) > 0);
    const imageCoverage = share(listings, (row) => (row.images_count ?? 0) > 0);
    const descriptionCoverage = share(listings, (row) => (row.description_snippet?.trim().length ?? 0) >= 40);
    const confidence = Math.min(0.85, Number(((Math.min(listings.length, 40) / 40 * 0.55) + surfaceCoverage * 0.20 + imageCoverage * 0.10 + descriptionCoverage * 0.15).toFixed(4)));
    return {
      neighborhood_id: entity.id,
      profile_version: 1,
      status: "draft",
      summary_fr: `${entity.canonical_name} : profil interne fondé sur ${listings.length} annonces observées. Il décrit la composition des biens et les équipements déclarés ; aucun signal de mobilité ou de proximité n’est encore certifié.`,
      lifestyle_tags: [],
      property_type_mix: propertyMix,
      amenity_signals: {
        pool_share: share(listings, (row) => row.has_pool === true),
        concierge_share: share(listings, (row) => row.has_concierge === true),
        equipped_kitchen_share: share(listings, (row) => row.has_equipped_kitchen === true),
        garage_share: share(listings, (row) => (row.garage_spaces ?? 0) > 0),
        terrace_share: share(listings, (row) => (row.terrace_m2 ?? 0) > 0),
        garden_share: share(listings, (row) => (row.garden_m2 ?? 0) > 0),
        signal_scope: "listing_observations",
      },
      mobility_signals: { status: "unavailable", reason: "no_certified_mobility_dataset" },
      market_signals: { listing_count: listings.length, surface_coverage: surfaceCoverage, image_coverage: imageCoverage, description_coverage: descriptionCoverage, scope: "observed_listings_not_transactions" },
      evidence_count: listings.length,
      confidence,
      methodology_version: "m2_listing_signals_v1",
      generated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("neighborhood_intelligence_profiles").upsert(rows, { onConflict: "neighborhood_id,profile_version" });
  if (error) throw error;
  console.log(JSON.stringify({ status: "ok", profiles: rows.length, methodology: "m2_listing_signals_v1" }));
}

main().catch((error) => {
  console.error("[p0-data-generate-neighborhood-intelligence]", error);
  process.exit(1);
});
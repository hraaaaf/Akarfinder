#!/usr/bin/env tsx
// P0 DATA M1 — idempotent import of the canonical V1 registry into Supabase.
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";
import { GEO_CITIES, GEO_NEIGHBORHOODS, normalizeGeoText } from "@/lib/geo/geo-entity-registry";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

type GeoRow = {
  id: string;
  entity_type: "city" | "neighborhood";
  parent_id: string | null;
  slug: string;
  canonical_name: string;
  normalized_name: string;
  validation_status: "validated" | "pending_review";
  seo_eligible: boolean;
  map_eligible: boolean;
  source_version: string;
  metadata: Record<string, unknown>;
};

type GeoAliasRow = {
  geo_entity_id: string;
  alias: string;
  normalized_alias: string;
  source: string;
  confidence: number;
};

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const cityIdBySlug = new Map(GEO_CITIES.map((city) => [city.slug, city.id]));

  const entities: GeoRow[] = [
    ...GEO_CITIES.map((city): GeoRow => ({
      id: city.id,
      entity_type: "city",
      parent_id: null,
      slug: city.slug,
      canonical_name: city.canonical_name,
      normalized_name: normalizeGeoText(city.canonical_name),
      validation_status: city.validation_status,
      seo_eligible: city.seo_eligible,
      map_eligible: false,
      source_version: "registry_v1",
      metadata: {},
    })),
    ...GEO_NEIGHBORHOODS.map((district): GeoRow => ({
      id: district.id,
      entity_type: "neighborhood",
      parent_id: cityIdBySlug.get(district.city_slug) ?? null,
      slug: district.slug,
      canonical_name: district.canonical_name,
      normalized_name: normalizeGeoText(district.canonical_name),
      validation_status: district.validation_status,
      seo_eligible: district.seo_eligible,
      map_eligible: district.map_eligible,
      source_version: "registry_v1",
      metadata: { city_slug: district.city_slug },
    })),
  ];

  if (entities.some((entity) => entity.entity_type === "neighborhood" && !entity.parent_id)) {
    throw new Error("A neighborhood references an unknown city slug");
  }

  const { error: entityError } = await supabase.from("geo_entities").upsert(entities, { onConflict: "id" });
  if (entityError) throw entityError;

  const aliasCandidates: GeoAliasRow[] = [
    ...GEO_CITIES.flatMap((city) => [city.canonical_name, city.slug, ...city.aliases].map((alias) => ({
      geo_entity_id: city.id,
      alias,
      normalized_alias: normalizeGeoText(alias),
      source: "registry_v1",
      confidence: 1,
    }))),
    ...GEO_NEIGHBORHOODS.flatMap((district) => [district.canonical_name, district.slug, ...district.aliases].map((alias) => ({
      geo_entity_id: district.id,
      alias,
      normalized_alias: normalizeGeoText(alias),
      source: "registry_v1",
      confidence: 1,
    }))),
  ];

  const aliases = Array.from(
    new Map(aliasCandidates.map((row) => [`${row.geo_entity_id}:${row.normalized_alias}`, row])).values(),
  );

  const { error: aliasError } = await supabase
    .from("geo_aliases")
    .upsert(aliases, { onConflict: "geo_entity_id,normalized_alias", ignoreDuplicates: false });
  if (aliasError) throw aliasError;

  console.log(JSON.stringify({
    status: "ok",
    cities: GEO_CITIES.length,
    neighborhoods: GEO_NEIGHBORHOODS.length,
    aliases: aliases.length,
    discarded_duplicate_aliases: aliasCandidates.length - aliases.length,
  }));
}

main().catch((error) => {
  console.error("[p0-data-sync-geography]", error);
  process.exit(1);
});

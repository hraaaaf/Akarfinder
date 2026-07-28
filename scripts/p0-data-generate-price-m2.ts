#!/usr/bin/env tsx
// P0 DATA M3 — generate internal asking-price references per m² from observed listings.
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";
import { normalizeGeoText } from "@/lib/geo/geo-entity-registry";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

type Listing = {
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: "sale" | "rent" | null;
  price_mad: number | null;
  surface_m2: number | null;
  built_surface_m2: number | null;
};

type Alias = { normalized_alias: string; geo_entity_id: string };
type Entity = { id: string; entity_type: "city" | "neighborhood"; parent_id: string | null };

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: listings, error: listingError }, { data: aliases, error: aliasError }, { data: entities, error: entityError }] = await Promise.all([
    supabase.from("property_listings").select("city,district,property_type,transaction_type,price_mad,surface_m2,built_surface_m2").limit(100000),
    supabase.from("geo_aliases").select("normalized_alias,geo_entity_id"),
    supabase.from("geo_entities").select("id,entity_type,parent_id"),
  ]);
  if (listingError) throw listingError;
  if (aliasError) throw aliasError;
  if (entityError) throw entityError;

  const entityById = new Map((entities as Entity[]).map((entity) => [entity.id, entity]));
  const aliasMap = new Map<string, string[]>();
  for (const alias of aliases as Alias[]) {
    const ids = aliasMap.get(alias.normalized_alias) ?? [];
    ids.push(alias.geo_entity_id);
    aliasMap.set(alias.normalized_alias, ids);
  }

  const groups = new Map<string, number[]>();
  const add = (geo: string, transaction: string, property: string, value: number) => {
    const k = `${geo}|${transaction}|${property}`;
    groups.set(k, [...(groups.get(k) ?? []), value]);
  };

  for (const listing of listings as Listing[]) {
    const surface = listing.built_surface_m2 || listing.surface_m2;
    if (!listing.city || !listing.district || !listing.price_mad || !surface || surface < 10 || surface > 2000) continue;
    if (!listing.transaction_type || !listing.property_type) continue;
    const cityIds = (aliasMap.get(normalizeGeoText(listing.city)) ?? []).filter((id) => entityById.get(id)?.entity_type === "city");
    const districtIds = (aliasMap.get(normalizeGeoText(listing.district)) ?? []).filter((id) => entityById.get(id)?.entity_type === "neighborhood");
    const neighborhoodId = districtIds.find((id) => cityIds.includes(entityById.get(id)?.parent_id ?? ""));
    if (!neighborhoodId) continue;
    const priceM2 = listing.price_mad / surface;
    const valid = listing.transaction_type === "sale" ? priceM2 >= 1000 && priceM2 <= 150000 : priceM2 >= 10 && priceM2 <= 3000;
    if (!valid) continue;
    add(neighborhoodId, listing.transaction_type, listing.property_type, priceM2);
    if (["apartment", "studio", "house", "villa"].includes(listing.property_type)) add(neighborhoodId, listing.transaction_type, "residential_all", priceM2);
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = [...groups.entries()].map(([key, values]) => {
    const [geo_entity_id, transaction_type, property_type] = key.split("|");
    const sorted = [...values].sort((a, b) => a - b);
    const sample = sorted.length;
    return {
      geo_entity_id,
      transaction_type,
      property_type,
      furnished_state: "all",
      reference_period_start: "2026-01-01",
      reference_period_end: today,
      sample_size: sample,
      median_price_m2: quantile(sorted, 0.5),
      p25_price_m2: quantile(sorted, 0.25),
      p75_price_m2: quantile(sorted, 0.75),
      mean_price_m2: sorted.reduce((sum, value) => sum + value, 0) / sample,
      currency: "MAD",
      confidence: Math.min(0.9, sample / 15),
      quality_status: sample >= 15 ? "reliable" : sample >= 5 ? "provisional" : "insufficient",
      methodology_version: "listing_price_m2_v1",
      input_snapshot_id: `property_listings_${today}`,
      calculated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("price_m2_references").upsert(rows, {
    onConflict: "geo_entity_id,transaction_type,property_type,furnished_state,reference_period_end,methodology_version",
  });
  if (error) throw error;
  console.log(JSON.stringify({ status: "ok", references: rows.length, provisional: rows.filter((r) => r.quality_status === "provisional").length, reliable: rows.filter((r) => r.quality_status === "reliable").length }));
}

main().catch((error) => {
  console.error("[p0-data-generate-price-m2]", error);
  process.exit(1);
});

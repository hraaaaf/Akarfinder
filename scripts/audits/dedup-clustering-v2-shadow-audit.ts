#!/usr/bin/env tsx
// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#6/10) -- shadow audit of the V2
// clustering scorer against REAL admitted data (listing_sources joined to
// property_listings, read-only). Writes NOTHING to property_clusters or
// property_cluster_members -- shadow only, per mission requirement.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { findCandidatePairs, type ClusterableOffer } from "../../lib/dedup-clustering/v2-scorer.js";

function loadEnv(): Record<string, string> {
  const envPath = "C:/Users/lenovo/Documents/AkarFinder/.env.local";
  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sources, error: sourcesError } = await supabase
    .from("listing_sources")
    .select("id, listing_url, source_name, source_offer_key, property_listing_id");
  if (sourcesError) throw sourcesError;

  const { data: listings, error: listingsError } = await supabase
    .from("property_listings")
    .select("id, title, city, district, property_type, transaction_type, price_mad, surface_m2, bedrooms_count, bathrooms_count");
  if (listingsError) throw listingsError;

  const listingById = new Map(listings.map((l) => [l.id, l]));

  const offers: ClusterableOffer[] = [];
  let sourcesMissingListing = 0;
  for (const s of sources) {
    const listing = listingById.get(s.property_listing_id);
    if (!listing) {
      sourcesMissingListing += 1;
      continue;
    }
    offers.push({
      source_offer_id: s.id,
      listing_url: s.listing_url,
      source_name: s.source_name,
      source_offer_key: s.source_offer_key,
      city: listing.city,
      district: listing.district,
      property_type: listing.property_type,
      transaction_type: listing.transaction_type,
      price_mad: listing.price_mad,
      surface_m2: listing.surface_m2,
      bedrooms_count: listing.bedrooms_count,
      bathrooms_count: listing.bathrooms_count,
      title: listing.title,
    });
  }

  const candidates = findCandidatePairs(offers);

  const byTier: Record<string, number> = {};
  for (const c of candidates) byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;

  const highConfidenceSamples = candidates.filter((c) => c.tier === "cross_source_high_confidence").slice(0, 15);
  const possibleMatchSamples = candidates.filter((c) => c.tier === "possible_match").slice(0, 15);

  console.log(JSON.stringify({
    audit_id: "dedup-clustering-v2-shadow-audit",
    generated_at_utc: new Date().toISOString(),
    write_mode: "SHADOW_ONLY_NO_WRITES",
    total_listing_sources_rows: sources.length,
    total_property_listings_rows: listings.length,
    sources_missing_listing_join: sourcesMissingListing,
    total_offers_scored: offers.length,
    total_candidate_pairs: candidates.length,
    distribution_by_tier: byTier,
    high_confidence_sample: highConfidenceSamples,
    possible_match_sample: possibleMatchSamples,
  }, null, 2));
}

main().catch((error) => {
  console.error("Fatal:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

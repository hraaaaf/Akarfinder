// Canonical fingerprint for approximate property deduplication.
//
// P3: the fingerprint is intentionally coarse — it groups listings that are
// almost certainly the same property. False negatives (same property, different
// bucket) are preferable to false positives (different properties merged).
//
// P4 will introduce duplicate groups and a reliability score to refine further.
//
// Format:
//   city|property_type|transaction_type|price_<bucket>|surface_<bucket>|bedrooms_<n>
//
// Example:
//   casablanca|apartment|sale|price_1300000|surface_120|bedrooms_3

import type { ScrapedListingP0 } from "../types.js";

// Price bucket: nearest 50 000 DH.
// Listings within 50k of each other (same type/city/size) are likely the same ad.
const PRICE_BUCKET = 50_000;

// Surface bucket: nearest 10 m².
// Small measurement differences (80 vs 82) should not split the same listing.
const SURFACE_BUCKET = 10;

function bucket(n: number | null, step: number): string {
  if (n == null) return "null";
  return String(Math.round(n / step) * step);
}

export function buildCanonicalFingerprint(listing: ScrapedListingP0): string {
  const city = (listing.city ?? "unknown")
    .toLowerCase()
    .replace(/\s+/g, "_")
    // Normalise common accents so "Fès" and "Fes" map to the same token.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const ptype = listing.property_type ?? "unknown";
  const tx = listing.transaction_type ?? "unknown";
  const price = `price_${bucket(listing.price_mad, PRICE_BUCKET)}`;
  const surface = `surface_${bucket(listing.surface_m2, SURFACE_BUCKET)}`;
  const beds = listing.bedrooms_count != null
    ? `bedrooms_${listing.bedrooms_count}`
    : "bedrooms_null";

  return `${city}|${ptype}|${tx}|${price}|${surface}|${beds}`;
}

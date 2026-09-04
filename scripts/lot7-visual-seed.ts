import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { adaptCollectionListing, type CollectionListing } from "../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../data-ingestion/sandbox-store.js";

const dbPath = process.env.AKARFINDER_SQLITE_PATH?.trim();
if (!dbPath) throw new Error("AKARFINDER_SQLITE_PATH is required");

const sample = JSON.parse(
  readFileSync(resolve(process.cwd(), "data-ingestion/samples/listing.complete.json"), "utf8"),
) as CollectionListing;

const rows = [
  { city: "Casablanca", type: "villa", tx: "sale", price: 4_850_000, surface: 320, title: "Villa contemporaine à Casablanca" },
  { city: "Casablanca", type: "villa", tx: "sale", price: 3_950_000, surface: 285, title: "Villa familiale lumineuse à Casablanca" },
  { city: "Casablanca", type: "villa", tx: "sale", price: 5_600_000, surface: 410, title: "Villa avec jardin à Casablanca" },
  { city: "Casablanca", type: "apartment", tx: "sale", price: 2_250_000, surface: 146, title: "Appartement premium à Casablanca" },
  { city: "Casablanca", type: "apartment", tx: "rent", price: 14_500, surface: 132, title: "Appartement à louer à Casablanca" },
  { city: "Rabat", type: "villa", tx: "sale", price: 4_300_000, surface: 300, title: "Villa moderne à Rabat" },
  { city: "Rabat", type: "apartment", tx: "sale", price: 1_980_000, surface: 118, title: "Appartement central à Rabat" },
  { city: "Marrakech", type: "villa", tx: "sale", price: 6_200_000, surface: 450, title: "Villa avec piscine à Marrakech" },
] as const;

const store = new Lot7SandboxStore(dbPath);
try {
  for (const [index, row] of rows.entries()) {
    const listing = structuredClone(sample);
    listing.akar_id = null;
    listing.source.name = "akarfinder";
    listing.source.source_id = `lot7-visual-${index + 1}`;
    listing.source.url = `https://akarfinder.local/source/lot7-visual-${index + 1}`;
    listing.source.first_seen_at = "2026-09-04T06:00:00Z";
    listing.source.last_seen_at = "2026-09-04T06:00:00Z";
    listing.source.scraped_at = "2026-09-04T06:00:00Z";
    listing.source.content_hash = (index + 1).toString(16).padStart(64, "0");
    listing.status = "active";
    listing.transaction = row.tx;
    listing.property_type = row.type;
    listing.title = row.title;
    listing.description = "Donnée canonique isolée utilisée pour la preuve visuelle Lot 7. Aucun accès production.";
    listing.price.amount = row.price;
    listing.price.period = row.tx === "rent" ? "month" : "total";
    listing.price.on_request = false;
    listing.surface.total_m2 = row.surface;
    listing.surface.habitable_m2 = row.surface;
    listing.surface.built_m2 = row.surface;
    listing.location.city = row.city;
    listing.location.district = null;
    listing.location.address_text = row.city;
    listing.provenance.source_type = "owner_direct";
    listing.provenance.source_listing_url = listing.source.url;
    listing.provenance.retrieval_method = "manual";
    listing.quality.score = 90 - index;
    store.importCanonical(adaptCollectionListing(listing, "lot7-visual-proof"));
  }

  console.log(JSON.stringify({ dbPath, count: store.count(), source: "akarfinder", productionWrites: 0 }));
} finally {
  store.close();
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { adaptCollectionListing, type CollectionListing } from "../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../data-ingestion/sandbox-store.js";

const dbPath = process.env.AKARFINDER_SQLITE_PATH?.trim();
if (!dbPath) throw new Error("AKARFINDER_SQLITE_PATH is required");

const sample = JSON.parse(
  readFileSync(resolve(process.cwd(), "data-ingestion/samples/listing.complete.json"), "utf8"),
) as CollectionListing;

const rows = [
  { type: "apartment", tx: "sale", price: 2_250_000, surface: 146, title: "Appartement premium à Casablanca" },
  { type: "villa", tx: "sale", price: 4_850_000, surface: 320, title: "Villa contemporaine à Casablanca" },
  { type: "land", tx: "sale", price: 3_100_000, surface: 520, title: "Terrain résidentiel à Casablanca" },
  { type: "office", tx: "rent", price: 18_500, surface: 118, title: "Bureau lumineux à Casablanca" },
  { type: "office", tx: "sale", price: 2_900_000, surface: 165, title: "Local commercial à Casablanca" },
  { type: "riad", tx: "sale", price: 5_400_000, surface: 260, title: "Riad avec patio à Casablanca" },
  { type: "apartment", tx: "rent", price: 14_500, surface: 132, title: "Appartement à louer à Casablanca" },
  { type: "villa", tx: "sale", price: 3_950_000, surface: 285, title: "Villa familiale lumineuse à Casablanca" },
] as const;

const store = new Lot7SandboxStore(dbPath);
try {
  for (const [index, row] of rows.entries()) {
    const listing = structuredClone(sample);
    listing.akar_id = null;
    listing.source.name = "agenz";
    listing.source.source_id = `lot7-visual-${index + 1}`;
    listing.source.url = `https://agenz.ma/lot7-visual-proof/${index + 1}`;
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
    listing.surface.land_m2 = row.type === "land" ? row.surface : null;
    listing.location.city = "Casablanca";
    listing.location.district = null;
    listing.location.address_text = "Casablanca";
    listing.provenance.source_type = "portal";
    listing.provenance.source_listing_url = listing.source.url;
    listing.provenance.retrieval_method = "manual";
    listing.quality.score = 95 - index;
    store.importCanonical(adaptCollectionListing(listing, "lot7-visual-proof"));
  }
} finally {
  store.close();
}

// The real public Search read-model only exposes persisted external rows when
// they carry the explicit OpenSERP publication metadata. Add that metadata to
// this isolated SQLite after the canonical import so the proof exercises the
// same public_indexed lane as production without changing canonical contracts.
const db = new DatabaseSync(dbPath);
try {
  const columns = db.prepare("PRAGMA table_info(property_listings)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "field_confidence")) {
    db.exec("ALTER TABLE property_listings ADD COLUMN field_confidence TEXT");
  }
  const metadata = JSON.stringify({
    provider: "openserp",
    acquisition_provider: "openserp",
    publication_lane: "external_web_result",
    classification_lane: "individual_listing",
    source_domain: "agenz.ma",
  });
  db.prepare("UPDATE property_listings SET field_confidence = ?").run(metadata);
} finally {
  db.close();
}

console.log(JSON.stringify({
  dbPath,
  count: rows.length,
  source: "agenz",
  publicationLane: "public_indexed",
  visualFamilies: ["apartment", "villa", "land", "office", "commercial", "riad"],
  productionWrites: 0,
}));

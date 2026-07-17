// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 -- exports the same synthetic
// fixture set used by Gate A (PGlite) as legacy-seed SQL + apply/verify/
// rollback SQL, for Gate B (real Postgres) to consume via psql. Not part of
// the committed test suite.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeBackfillPlan, type BackfillListingSourceRow, type BackfillPropertyListingRow } from "../../../lib/market-index/market-index-backfill-plan";
import { buildApplySql, buildRollbackSql, buildVerifySql } from "../../../lib/market-index/market-index-backfill-sql";

const listings: BackfillPropertyListingRow[] = [
  { id: 1001, price_mad: 500000, transaction_type: "sale", title: "Appartement Agdal", description_snippet: "Bel appartement 3 pieces", field_confidence: { provider: "openserp" } },
  { id: 1002, price_mad: 800000, transaction_type: "sale", title: "Villa Palmeraie", description_snippet: "Villa avec piscine", field_confidence: { provider: "openserp" } },
  { id: 1003, price_mad: 300000, transaction_type: "rent", title: "Studio Maarif", description_snippet: "Studio meuble", field_confidence: null },
  { id: 1004, price_mad: 450000, transaction_type: "sale", title: "Riad Medina", description_snippet: "Riad authentique", field_confidence: { provider: "openserp" } },
  { id: 1005, price_mad: 600000, transaction_type: "sale", title: "Appartement Hivernage", description_snippet: "Vue piscine", field_confidence: { provider: "partner_feed_xyz", source_domain: "known-partner.ma" } },
  { id: 1006, price_mad: 700000, transaction_type: "sale", title: "Duplex Racine", description_snippet: "Duplex standing", field_confidence: { provider: "openserp" } },
  { id: 1007, price_mad: 550000, transaction_type: "sale", title: "Appartement Gauthier", description_snippet: "Proche centre ville", field_confidence: { provider: "openserp" } },
  { id: 1008, price_mad: 5500000, transaction_type: "sale", title: "Villa Californie", description_snippet: "Villa de luxe 10 pieces", field_confidence: { provider: "openserp" } },
  { id: 1009, price_mad: null, transaction_type: "sale", title: "Terrain Ain Diab", description_snippet: "Terrain constructible", field_confidence: { provider: "openserp" } },
  { id: 1010, price_mad: 8000, transaction_type: "rent", title: "Appartement meuble Racine", description_snippet: "Location longue duree", field_confidence: { provider: "openserp" } },
  { id: 1011, price_mad: 900000, transaction_type: "sale", title: "Bel appartement 3 pieces vue mer", description_snippet: "Tres bel appartement lumineux avec vue exceptionnelle", field_confidence: { provider: "openserp" } },
  { id: 1012, price_mad: 920000, transaction_type: "sale", title: "Bel appartement 3 pieces vue mer", description_snippet: "Tres bel appartement lumineux avec vue exceptionnelle", field_confidence: { provider: "openserp" } },
];

const sources: BackfillListingSourceRow[] = [
  { id: 2001, property_listing_id: 1001, source_name: "mouldar", listing_url: "https://mouldar.com/1", source_url: "https://mouldar.com/1" },
  { id: 2002, property_listing_id: 1002, source_name: "mubawab", listing_url: "https://mubawab.ma/a", source_url: "https://mubawab.ma/a" },
  { id: 2003, property_listing_id: 1002, source_name: "avito", listing_url: "https://avito.ma/b", source_url: "https://avito.ma/b" },
  { id: 2004, property_listing_id: 1003, source_name: "mubawab", listing_url: "https://mubawab.ma/c", source_url: "https://mubawab.ma/c" },
  { id: 2005, property_listing_id: 1004, source_name: "sarouty", listing_url: null, source_url: null },
  { id: 2006, property_listing_id: 1005, source_name: "known-partner", listing_url: "https://known-partner.ma/d", source_url: "https://known-partner.ma/d" },
  { id: 2007, property_listing_id: 1006, source_name: "mouldar", listing_url: "https://mouldar.com/dup-domain-1", source_url: "https://mouldar.com/dup-domain-1" },
  { id: 2008, property_listing_id: 1007, source_name: "agenz", listing_url: "https://agenz.ma/e", source_url: "https://agenz.ma/e" },
  { id: 2009, property_listing_id: 1008, source_name: "agenz", listing_url: "https://agenz.ma/f", source_url: "https://agenz.ma/f" },
  { id: 2010, property_listing_id: 1009, source_name: "sarouty", listing_url: "https://sarouty.ma/g", source_url: "https://sarouty.ma/g" },
  { id: 2011, property_listing_id: 1010, source_name: "mouldar", listing_url: "https://mouldar.com/h", source_url: "https://mouldar.com/h" },
  { id: 2012, property_listing_id: 1011, source_name: "mubawab", listing_url: "https://mubawab.ma/i", source_url: "https://mubawab.ma/i" },
  { id: 2013, property_listing_id: 1012, source_name: "mubawab", listing_url: "https://mubawab.ma/j", source_url: "https://mubawab.ma/j" },
];

const RUN_ID = "gate-b-synthetic-run";
const OUT_DIR = process.argv[2] || join(process.cwd(), "data", "audits");

const legacySeedSql = [
  "create table property_listings (id bigint primary key, price_mad numeric, city text, district text, property_type text, transaction_type text, surface_m2 numeric, duplicate_group_id text, field_confidence jsonb, title text, description_snippet text);",
  "create table listing_sources (id bigint primary key, property_listing_id bigint not null references property_listings(id), source_name text, listing_url text, source_url text, is_active boolean not null default true, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now());",
  "alter table property_listings enable row level security;",
  "alter table listing_sources enable row level security;",
  ...listings.map(
    (l) =>
      `insert into property_listings (id, price_mad, transaction_type, title, description_snippet, field_confidence) values (${l.id}, ${l.price_mad === null ? "NULL" : l.price_mad}, '${l.transaction_type}', '${(l.title ?? "").replace(/'/g, "''")}', '${(l.description_snippet ?? "").replace(/'/g, "''")}', ${l.field_confidence ? `'${JSON.stringify(l.field_confidence).replace(/'/g, "''")}'::jsonb` : "NULL"});`,
  ),
  ...sources.map(
    (s) =>
      `insert into listing_sources (id, property_listing_id, source_name, listing_url, source_url) values (${s.id}, ${s.property_listing_id}, '${s.source_name}', ${s.listing_url ? `'${s.listing_url}'` : "NULL"}, ${s.source_url ? `'${s.source_url}'` : "NULL"});`,
  ),
].join("\n");

const { plan, eligible } = computeBackfillPlan(listings, sources);

writeFileSync(join(OUT_DIR, "gate-fixture-legacy-seed.sql"), `${legacySeedSql}\n`);
writeFileSync(join(OUT_DIR, "gate-fixture-apply.sql"), buildApplySql(RUN_ID, eligible));
writeFileSync(join(OUT_DIR, "gate-fixture-verify.sql"), buildVerifySql(RUN_ID, eligible));
writeFileSync(join(OUT_DIR, "gate-fixture-rollback.sql"), buildRollbackSql(RUN_ID, eligible));
writeFileSync(join(OUT_DIR, "gate-fixture-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);

console.log(JSON.stringify(plan, null, 2));
console.log(`eligible count: ${eligible.length}`);
console.log(`Wrote fixture SQL files to ${OUT_DIR}`);

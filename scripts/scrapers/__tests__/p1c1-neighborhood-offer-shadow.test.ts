import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const SQL = readFileSync("supabase/migrations/20260810130500_p1c1_neighborhood_offer_shadow.sql", "utf8");

const SEEDS = [
  ["10000000-0000-4000-8000-000000000001", "city_casa", "casablanca", "Casablanca", "district_casa_alpha", "alpha", "Alpha", "sale", "apartment", 1000000, 100, null, "fresh_confirmed", 80, "A", "eligible_primary", "source-a.ma", 101],
  ["10000000-0000-4000-8000-000000000002", "city_casa", "casablanca", "Casablanca", "district_casa_alpha", "alpha", "Alpha", "sale", "apartment", 1200000, 100, 12000, "fresh_confirmed", 90, "A", "eligible_primary", "source-b.ma", 102],
  ["10000000-0000-4000-8000-000000000003", "city_casa", "casablanca", "Casablanca", "district_casa_alpha", "alpha", "Alpha", "rent", "studio", 7000, 70, null, "seed_only", 70, "B", "eligible_secondary", "source-a.ma", 103],
  ["10000000-0000-4000-8000-000000000004", "city_casa", "casablanca", "Casablanca", "district_casa_alpha", "alpha", "Alpha", "rent", "studio", null, 60, null, "seed_only", 60, "B", "eligible_secondary", "source-a.ma", 104],
  ["10000000-0000-4000-8000-000000000005", "city_rabat", "rabat", "Rabat", "district_rabat_beta", "beta", "Beta", "sale", "villa", null, 200, null, "fresh_confirmed", 75, "B", "eligible_primary", "source-c.ma", 105],
] as const;

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.thin_index_search_documents (
      seed_id uuid primary key,
      normalized_intent text,
      normalized_property_type text,
      normalized_price_mad numeric,
      normalized_surface_m2 numeric,
      normalized_price_m2 numeric,
      freshness_status text,
      quality_score smallint,
      quality_tier text,
      display_eligibility text
    );
    create table public.source_offer_seeds (
      id uuid primary key,
      source_domain text not null,
      last_observed_at timestamptz,
      metadata jsonb not null default '{}'::jsonb
    );
    create table public.p1b3_fixture (
      seed_id uuid primary key,
      city_id text,
      city_slug text,
      city_name text,
      neighborhood_id text,
      neighborhood_slug text,
      neighborhood_name text,
      resolver_version text,
      resolved_at timestamptz
    );
    create view public.odm_territorial_metric_listing_join_v1 as select * from public.p1b3_fixture;
    create function public.odm_territorial_metric_join_report_v1()
    returns jsonb language sql stable as $$
      select jsonb_build_object(
        'contract_version','p1b3_territorial_metric_join_v1',
        'latest_resolution_collisions',0,
        'conflicting_resolution_history',0,
        'missing_canonical_geo',0,
        'metric_layers_activated',false
      );
    $$;
  `);

  for (const row of SEEDS) {
    const [seed, cityId, citySlug, cityName, neighborhoodId, neighborhoodSlug, neighborhoodName, intent, propertyType, price, surface, priceM2, freshness, quality, tier, eligibility, domain, propertyId] = row;
    await db.query(`insert into public.p1b3_fixture values ($1,$2,$3,$4,$5,$6,$7,'fixture_resolver_v1',clock_timestamp())`, [seed, cityId, citySlug, cityName, neighborhoodId, neighborhoodSlug, neighborhoodName]);
    await db.query(`insert into public.thin_index_search_documents values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [seed, intent, propertyType, price, surface, priceM2, freshness, quality, tier, eligibility]);
    await db.query(`insert into public.source_offer_seeds values ($1,$2,clock_timestamp(),jsonb_build_object('coverage_bridge',jsonb_build_object('property_listing_id',$3::text)))`, [seed, domain, propertyId]);
  }
  await db.exec(SQL);
  return db;
}

async function one(db: PGlite, sql: string) {
  const result = await db.query<Record<string, any>>(sql);
  return result.rows[0];
}

test("P1C.1 listing shadow uses only certified Geo rows and derives price/m² only from exact normalized values", async () => {
  const db = await fixture();
  assert.deepEqual(await one(db, `select count(*)::int n, count(distinct seed_id)::int seeds, bool_and(metric_state='shadow' and reliability_certified=false and public_activation=false and metric_layers_activated=false) safe from public.odm_neighborhood_offer_shadow_listing_v1`), { n: 5, seeds: 5, safe: true });
  const derived = await one(db, `select price_per_m2_mad::numeric value, price_per_m2_source source from public.odm_neighborhood_offer_shadow_listing_v1 where seed_id='10000000-0000-4000-8000-000000000001'`);
  assert.equal(Number(derived.value), 10000);
  assert.equal(derived.source, "derived_exact_price_surface");
  const normalized = await one(db, `select price_per_m2_mad::numeric value, price_per_m2_source source from public.odm_neighborhood_offer_shadow_listing_v1 where seed_id='10000000-0000-4000-8000-000000000002'`);
  assert.equal(Number(normalized.value), 12000);
  assert.equal(normalized.source, "normalized_price_m2");
  await db.close();
});

test("P1C.1 price medians are segmented by transaction and never mix sale with rent", async () => {
  const db = await fixture();
  const sale = await one(db, `select listing_count::int n,price_sample_count::int pc,median_price_mad::numeric med,price_per_m2_sample_count::int m2c,median_price_per_m2_mad::numeric m2 from public.odm_neighborhood_offer_shadow_segment_v1 where neighborhood_id='district_casa_alpha' and transaction_type='sale'`);
  assert.equal(sale.n, 2);
  assert.equal(sale.pc, 2);
  assert.equal(Number(sale.med), 1100000);
  assert.equal(sale.m2c, 2);
  assert.equal(Number(sale.m2), 11000);
  const rent = await one(db, `select listing_count::int n,price_sample_count::int pc,median_price_mad::numeric med,price_per_m2_sample_count::int m2c,median_price_per_m2_mad::numeric m2 from public.odm_neighborhood_offer_shadow_segment_v1 where neighborhood_id='district_casa_alpha' and transaction_type='rent'`);
  assert.equal(rent.n, 2);
  assert.equal(rent.pc, 1);
  assert.equal(Number(rent.med), 7000);
  assert.equal(rent.m2c, 1);
  assert.equal(Number(rent.m2), 100);
  await db.close();
});

test("P1C.1 neighborhood summary discloses volume, transaction/type mix, freshness and completeness", async () => {
  const db = await fixture();
  const r = await one(db, `select listing_count::int n,rows_with_price::int prices,rows_with_surface::int surfaces,rows_with_price_per_m2::int m2,fresh_confirmed_count::int fresh,seed_only_count::int seed,price_coverage_percent::numeric pc,surface_coverage_percent::numeric sc,price_per_m2_coverage_percent::numeric m2c,transaction_breakdown,property_type_breakdown,sample_sizes_disclosed,reliability_certified,public_activation from public.odm_neighborhood_offer_shadow_summary_v1 where neighborhood_id='district_casa_alpha'`);
  assert.equal(r.n, 4);
  assert.equal(r.prices, 3);
  assert.equal(r.surfaces, 4);
  assert.equal(r.m2, 3);
  assert.equal(r.fresh, 2);
  assert.equal(r.seed, 2);
  assert.equal(Number(r.pc), 75);
  assert.equal(Number(r.sc), 100);
  assert.equal(Number(r.m2c), 75);
  assert.deepEqual(r.transaction_breakdown, { rent: 2, sale: 2 });
  assert.deepEqual(r.property_type_breakdown, { apartment: 2, studio: 2 });
  assert.equal(r.sample_sizes_disclosed, true);
  assert.equal(r.reliability_certified, false);
  assert.equal(r.public_activation, false);
  await db.close();
});

test("P1C.1 keeps price metrics null when price evidence is absent", async () => {
  const db = await fixture();
  const r = await one(db, `select listing_count::int n,price_sample_count::int pc,median_price_mad,price_per_m2_sample_count::int m2c,median_price_per_m2_mad,price_coverage_percent::numeric coverage,reliability_certified,public_activation from public.odm_neighborhood_offer_shadow_segment_v1 where neighborhood_id='district_rabat_beta' and transaction_type='sale'`);
  assert.equal(r.n, 1);
  assert.equal(r.pc, 0);
  assert.equal(r.median_price_mad, null);
  assert.equal(r.m2c, 0);
  assert.equal(r.median_price_per_m2_mad, null);
  assert.equal(Number(r.coverage), 0);
  assert.equal(r.reliability_certified, false);
  assert.equal(r.public_activation, false);
  await db.close();
});

test("P1C.1 report is Shadow-only and inherits collision-free P1B.3 Geo truth", async () => {
  const db = await fixture();
  const r = await one(db, `select public.odm_neighborhood_offer_shadow_report_v1() report`);
  const report = r.report;
  assert.equal(report.contract_version, "p1c1_neighborhood_offer_shadow_v1");
  assert.equal(Number(report.listing_rows), 5);
  assert.equal(Number(report.distinct_seeds), 5);
  assert.equal(Number(report.neighborhoods), 2);
  assert.equal(Number(report.geo_latest_resolution_collisions), 0);
  assert.equal(Number(report.geo_conflicting_resolution_history), 0);
  assert.equal(Number(report.geo_missing_canonical_geo), 0);
  assert.equal(report.reliability_certified, false);
  assert.equal(report.public_activation, false);
  assert.equal(report.metric_layers_activated, false);
  assert.equal(report.sale_rent_price_medians_mixed, false);
  assert.equal(report.fuzzy_geo_inference, false);
  assert.equal(report.sample_sizes_disclosed, true);
  await db.close();
});

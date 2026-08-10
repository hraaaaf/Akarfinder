import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const SQL = readFileSync("supabase/migrations/20260810133000_p1c2_neighborhood_offer_reliability.sql", "utf8");

type ListingInput = {
  neighborhoodId: string;
  transactionType?: string;
  price?: number | null;
  surface?: number | null;
  priceM2?: number | null;
  freshness?: "fresh_confirmed" | "seed_only";
  source?: string;
};

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.odm_neighborhood_offer_shadow_listing_v1 (
      seed_id text primary key,
      city_id text not null,
      city_slug text not null,
      city_name text not null,
      neighborhood_id text not null,
      neighborhood_slug text not null,
      neighborhood_name text not null,
      transaction_type text,
      property_type text,
      price_mad numeric,
      surface_m2 numeric,
      price_per_m2_mad numeric,
      freshness_status text,
      source_domain text
    );
    create function public.odm_neighborhood_offer_shadow_report_v1()
    returns jsonb language sql stable as $$
      select jsonb_build_object(
        'contract_version','p1c1_neighborhood_offer_shadow_v1',
        'listing_rows',(select count(*) from public.odm_neighborhood_offer_shadow_listing_v1),
        'neighborhoods',(select count(distinct neighborhood_id) from public.odm_neighborhood_offer_shadow_listing_v1),
        'public_activation',false,
        'reliability_certified',false,
        'metric_layers_activated',false
      );
    $$;
  `);
  await db.exec(SQL);
  return db;
}

let nextSeed = 1;
async function addListing(db: PGlite, input: ListingInput) {
  const seed = `seed-${nextSeed++}`;
  const slug = input.neighborhoodId.replace(/^district_/, "").replaceAll("_", "-");
  const name = slug.replaceAll("-", " ");
  await db.query(
    `insert into public.odm_neighborhood_offer_shadow_listing_v1(
      seed_id,city_id,city_slug,city_name,neighborhood_id,neighborhood_slug,neighborhood_name,
      transaction_type,property_type,price_mad,surface_m2,price_per_m2_mad,freshness_status,source_domain
    ) values ($1,'city_test','test','Test',$2,$3,$4,$5,'apartment',$6,$7,$8,$9,$10)`,
    [
      seed,
      input.neighborhoodId,
      slug,
      name,
      input.transactionType ?? "sale",
      input.price ?? null,
      input.surface ?? null,
      input.priceM2 ?? null,
      input.freshness ?? "fresh_confirmed",
      input.source ?? "source-a.ma",
    ],
  );
}

async function one(db: PGlite, sql: string) {
  const result = await db.query<Record<string, any>>(sql);
  return result.rows[0];
}

test("P1C.2 classifier has fail-closed 5/10/20 sample boundaries", async () => {
  const db = await fixture();
  const r = await one(db, `select
    public.odm_p1c2_metric_reliability_level_v1(4,100,100,10,0,0) a,
    public.odm_p1c2_metric_reliability_level_v1(5,50,50,2,30,1.5) b,
    public.odm_p1c2_metric_reliability_level_v1(10,60,60,2,20,1.0) c,
    public.odm_p1c2_metric_reliability_level_v1(20,75,70,3,15,0.75) d`);
  assert.deepEqual(r, { a: "insufficient", b: "limited", c: "moderate", d: "strong" });
  await db.close();
});

test("ten healthy metric samples are moderate, never strong", async () => {
  const db = await fixture();
  for (let i = 0; i < 10; i += 1) {
    const price = 100 + i * 5;
    await addListing(db, {
      neighborhoodId: "district_alpha",
      price,
      surface: 100,
      priceM2: price / 100,
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select sample_count::int n,field_coverage_percent::numeric coverage,fresh_sample_percent::numeric fresh,source_domain_count::int sources,reliability_level,p1c3_review_candidate,public_activation from public.odm_neighborhood_offer_reliability_metric_v1 where neighborhood_id='district_alpha' and transaction_type='sale' and metric_name='price_mad'`);
  assert.equal(r.n, 10);
  assert.equal(Number(r.coverage), 100);
  assert.equal(Number(r.fresh), 100);
  assert.equal(r.sources, 2);
  assert.equal(r.reliability_level, "moderate");
  assert.equal(r.p1c3_review_candidate, true);
  assert.equal(r.public_activation, false);
  await db.close();
});

test("four perfect samples remain insufficient", async () => {
  const db = await fixture();
  for (let i = 0; i < 4; i += 1) {
    await addListing(db, {
      neighborhoodId: "district_beta",
      price: 100 + i,
      surface: 100,
      priceM2: 1 + i / 100,
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select sample_count::int n,reliability_level,p1c3_review_candidate from public.odm_neighborhood_offer_reliability_metric_v1 where neighborhood_id='district_beta' and metric_name='price_mad'`);
  assert.equal(r.n, 4);
  assert.equal(r.reliability_level, "insufficient");
  assert.equal(r.p1c3_review_candidate, false);
  await db.close();
});

test("zero-sample metrics stay explicit and insufficient", async () => {
  const db = await fixture();
  for (let i = 0; i < 5; i += 1) {
    await addListing(db, {
      neighborhoodId: "district_gamma",
      price: null,
      surface: 100 + i,
      priceM2: null,
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select count(*)::int metric_rows,
    count(*) filter(where sample_count=0)::int zero_rows,
    bool_and(reliability_level='insufficient') filter(where sample_count=0) zero_insufficient
    from public.odm_neighborhood_offer_reliability_metric_v1 where neighborhood_id='district_gamma'`);
  assert.equal(r.metric_rows, 3);
  assert.equal(r.zero_rows, 2);
  assert.equal(r.zero_insufficient, true);
  await db.close();
});

test("gross IQR dispersion downgrades an otherwise moderate sample", async () => {
  const db = await fixture();
  const prices = [1, 2, 3, 4, 5, 100, 200, 300, 400, 500];
  for (let i = 0; i < prices.length; i += 1) {
    await addListing(db, {
      neighborhoodId: "district_delta",
      price: prices[i],
      surface: 1,
      priceM2: prices[i],
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select sample_count::int n,iqr_to_median_ratio::numeric dispersion,outlier_percent::numeric outliers,reliability_level from public.odm_neighborhood_offer_reliability_metric_v1 where neighborhood_id='district_delta' and metric_name='price_mad'`);
  assert.equal(r.n, 10);
  assert.ok(Number(r.dispersion) > 1.5);
  assert.equal(r.reliability_level, "insufficient");
  await db.close();
});

test("segment health can be moderate without certifying market representativeness", async () => {
  const db = await fixture();
  for (let i = 0; i < 10; i += 1) {
    await addListing(db, {
      neighborhoodId: "district_epsilon",
      price: null,
      surface: 100,
      priceM2: null,
      freshness: i < 8 ? "fresh_confirmed" : "seed_only",
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select listing_count::int n,fresh_listing_percent::numeric fresh,source_domain_count::int sources,sample_health_level,market_representativeness_certified,public_activation from public.odm_neighborhood_offer_reliability_segment_health_v1 where neighborhood_id='district_epsilon'`);
  assert.equal(r.n, 10);
  assert.equal(Number(r.fresh), 80);
  assert.equal(r.sources, 2);
  assert.equal(r.sample_health_level, "moderate");
  assert.equal(r.market_representativeness_certified, false);
  assert.equal(r.public_activation, false);
  await db.close();
});

test("P1C.2 report never auto-activates review candidates", async () => {
  const db = await fixture();
  for (let i = 0; i < 10; i += 1) {
    await addListing(db, {
      neighborhoodId: "district_zeta",
      price: 100 + i,
      surface: 100 + i,
      priceM2: 1,
      source: i % 2 === 0 ? "source-a.ma" : "source-b.ma",
    });
  }
  const r = await one(db, `select public.odm_neighborhood_offer_reliability_report_v1() report`);
  assert.equal(r.report.contract_version, "p1c2_neighborhood_offer_reliability_v1");
  assert.ok(Number(r.report.p1c3_review_candidates) > 0);
  assert.equal(r.report.market_representativeness_certified, false);
  assert.equal(r.report.public_activation, false);
  assert.equal(r.report.metric_layers_activated, false);
  assert.equal(r.report.p1c3_auto_activation, false);
  await db.close();
});

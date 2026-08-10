import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const SQL = readFileSync("supabase/migrations/20260809221500_p1b12_tier_a_resolution_canary.sql", "utf8");
const SEEDS = [
  ["049cd577-fc81-4d23-bc1c-2d5cf84214ea", "Hay Mohammadi", "mouldar.com"],
  ["6aed05ed-5aee-415f-98cb-ff87db6d2cc5", "Dakhla", "mouldar.com"],
  ["6d72d3f0-8697-4b88-9876-5ce0806aa681", "Hay Mohammadi", "mouldar.com"],
  ["b36688fd-fe7b-43e3-bad6-e968e2ecf4c8", "Hay Mohammadi", "mubawab.ma"],
  ["d1ecf541-bb26-43b1-87e7-d4dedd03b413", "Dakhla", "mubawab.ma"],
  ["d69e04e4-92bd-4bd9-bbd2-2bfc07b5fa7e", "Hay Mohammadi", "mouldar.com"],
  ["e804e8ab-2575-412e-b0dd-0b01737513b1", "Hay Mohammadi", "mouldar.com"],
  ["fbbdd20c-8d8b-4b78-a186-652a7557cf7e", "Dakhla", "mouldar.com"],
] as const;

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.geo_entities (
      id text primary key, entity_type text not null, parent_id text,
      validation_status text not null, map_eligible boolean not null, seo_eligible boolean not null
    );
    create table public.source_offer_seeds (
      id uuid primary key, source_domain text not null, metadata jsonb not null default '{}'::jsonb
    );
    create table public.thin_index_search_documents (
      seed_id uuid primary key, vertical_classification text not null, document_kind text not null, display_eligibility text not null
    );
    create table public.property_listings (
      id bigint primary key, city text not null, district text
    );
    create table public.geo_resolution_events (
      id bigint generated always as identity primary key,
      raw_city text, raw_neighborhood text, resolved_city_id text, resolved_neighborhood_id text,
      resolution_status text not null, candidates jsonb not null default '[]'::jsonb,
      source_record_type text not null, source_record_id text not null, resolver_version text not null,
      created_at timestamptz not null default clock_timestamp()
    );
    insert into public.geo_entities values
      ('city_agadir','city',null,'validated',true,true),
      ('district_agadir_dakhla','neighborhood','city_agadir','validated',false,false),
      ('district_agadir_hay_mohammadi','neighborhood','city_agadir','validated',false,false);
  `);
  let propertyId = 1000;
  for (const [seed, district, domain] of SEEDS) {
    propertyId += 1;
    await db.query(`insert into public.property_listings values ($1,'Agadir',$2)`, [propertyId, district]);
    await db.query(`insert into public.source_offer_seeds values ($1,$2,jsonb_build_object('coverage_bridge',jsonb_build_object('property_listing_id',$3::text)))`, [seed, domain, propertyId]);
    await db.query(`insert into public.thin_index_search_documents values ($1,'real_estate_likely','LISTING','eligible_secondary')`, [seed]);
  }
  await db.exec(SQL);
  return db;
}

async function one(db: PGlite, sql: string) {
  const result = await db.query<Record<string, unknown>>(sql);
  return result.rows[0];
}

test("P1B.12 preflight is exactly 8 / 3 Dakhla / 5 Hay Mohammadi / 2 sources", async () => {
  const db = await fixture();
  assert.deepEqual(await one(db, `select count(*)::int n, count(*) filter(where neighborhood_id='district_agadir_dakhla')::int d, count(*) filter(where neighborhood_id='district_agadir_hay_mohammadi')::int h, count(distinct source_domain)::int s from public.odm_p1b12_tier_a_resolution_candidates_v1`), { n: 8, d: 3, h: 5, s: 2 });
  await db.close();
});

test("P1B.12 apply writes exactly eight append-only resolved events and becomes non-replayable", async () => {
  const db = await fixture();
  const applied = await one(db, `select public.odm_p1b12_tier_a_resolution_apply_v1(8) result`);
  assert.match(JSON.stringify(applied.result), /"inserted":8/);
  assert.deepEqual(await one(db, `select count(*)::int n, count(*) filter(where resolved_neighborhood_id='district_agadir_dakhla')::int d, count(*) filter(where resolved_neighborhood_id='district_agadir_hay_mohammadi')::int h from public.geo_resolution_events where resolver_version='p1b12_tier_a_authority_canary_v1' and resolution_status='resolved'`), { n: 8, d: 3, h: 5 });
  assert.deepEqual(await one(db, `select count(*)::int n from public.odm_p1b12_tier_a_resolution_candidates_v1`), { n: 0 });
  await assert.rejects(() => db.query(`select public.odm_p1b12_tier_a_resolution_apply_v1(8)`), /cohort drift/);
  await db.exec("rollback");
  await db.close();
});

test("P1B.12 fails closed if one persisted district drifts", async () => {
  const db = await fixture();
  await db.exec(`update public.property_listings set district='Other' where id=(select min(id) from public.property_listings)`);
  await assert.rejects(() => db.query(`select public.odm_p1b12_tier_a_resolution_apply_v1(8)`), /cohort drift/);
  await db.exec("rollback");
  assert.deepEqual(await one(db, `select count(*)::int n from public.geo_resolution_events`), { n: 0 });
  await db.close();
});

test("P1B.12 requires protected validated P1B.11 Registry targets", async () => {
  for (const mutation of [
    `update public.geo_entities set validation_status='draft' where id='district_agadir_dakhla'`,
    `update public.geo_entities set map_eligible=true where id='district_agadir_dakhla'`,
    `update public.geo_entities set seo_eligible=true where id='district_agadir_hay_mohammadi'`,
  ]) {
    const db = await fixture();
    await db.exec(mutation);
    await assert.rejects(() => db.query(`select public.odm_p1b12_tier_a_resolution_apply_v1(8)`), /cohort drift/);
    await db.exec("rollback");
    await db.close();
  }
});

test("P1B.12 rollback is append-only and restores latest unresolved state", async () => {
  const db = await fixture();
  await db.query(`select public.odm_p1b12_tier_a_resolution_apply_v1(8)`);
  const rolled = await one(db, `select public.odm_p1b12_tier_a_resolution_rollback_v1(8) result`);
  assert.match(JSON.stringify(rolled.result), /"unresolved_events_inserted":8/);
  assert.deepEqual(await one(db, `select count(*)::int n from public.geo_resolution_events`), { n: 16 });
  assert.deepEqual(await one(db, `with latest as (select distinct on(source_record_id) * from public.geo_resolution_events order by source_record_id,created_at desc,id desc) select count(*)::int n, bool_and(resolution_status='unresolved') all_unresolved from latest`), { n: 8, all_unresolved: true });
  assert.deepEqual(await one(db, `select count(*)::int n from public.odm_p1b12_tier_a_resolution_candidates_v1`), { n: 8 });
  await db.close();
});

test("P1B.12 rollback refuses drift if a newer event exists", async () => {
  const db = await fixture();
  await db.query(`select public.odm_p1b12_tier_a_resolution_apply_v1(8)`);
  const seed = SEEDS[0][0];
  await db.query(`insert into public.geo_resolution_events(raw_city,raw_neighborhood,resolution_status,source_record_type,source_record_id,resolver_version) values('Agadir','Hay Mohammadi','unresolved','source_offer_seed',$1,'external_newer_v1')`, [seed]);
  await assert.rejects(() => db.query(`select public.odm_p1b12_tier_a_resolution_rollback_v1(8)`), /rollback cohort drift/);
  await db.exec("rollback");
  await db.close();
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const APPLY_SQL = readFileSync("supabase/migration-designs/p1b10_tier_a_registry_write.sql", "utf8");
const ROLLBACK_SQL = readFileSync("supabase/migration-designs/p1b10_tier_a_registry_rollback.sql", "utf8");

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table public.geo_entities (
      id text primary key,
      entity_type text not null check (entity_type in ('country','region','city','neighborhood')),
      parent_id text references public.geo_entities(id) on delete restrict,
      slug text not null,
      canonical_name text not null,
      normalized_name text not null,
      validation_status text not null check (validation_status in ('draft','validated','deprecated')),
      seo_eligible boolean not null default false,
      map_eligible boolean not null default false,
      source_version text not null,
      metadata jsonb not null default '{}'::jsonb,
      unique(entity_type,parent_id,slug)
    );
    create table public.geo_aliases (
      id uuid primary key,
      geo_entity_id text not null references public.geo_entities(id) on delete cascade,
      alias text not null,
      normalized_alias text not null,
      locale text,
      source text not null,
      confidence numeric not null check (confidence >= 0 and confidence <= 1),
      unique(geo_entity_id,locale,normalized_alias)
    );
    create table public.geo_resolution_events (
      id uuid primary key,
      source_record_type text not null,
      source_record_id text not null,
      resolution_status text not null,
      resolved_city_id text references public.geo_entities(id) on delete set null,
      resolved_neighborhood_id text references public.geo_entities(id) on delete set null,
      created_at timestamptz not null default now()
    );
    create table public.neighborhood_intelligence_profiles (
      id text primary key,
      neighborhood_id text not null references public.geo_entities(id) on delete restrict
    );
    create table public.price_m2_references (
      id text primary key,
      geo_entity_id text not null references public.geo_entities(id) on delete restrict
    );
    insert into public.geo_entities(id,entity_type,parent_id,slug,canonical_name,normalized_name,validation_status,seo_eligible,map_eligible,source_version,metadata)
    values ('city_agadir','city',null,'agadir','Agadir','agadir','validated',true,true,'registry_v1','{"country":"MA"}'::jsonb);
  `);
  return db;
}

async function scalar(db: PGlite, sql: string) {
  const result = await db.query<Record<string, unknown>>(sql);
  return result.rows[0];
}

test("P1B.10 apply creates exactly two fail-closed Tier A Registry candidates and no geo resolutions", async () => {
  const db = await fixture();
  await db.exec(APPLY_SQL);
  const entity = await scalar(db, `select count(*)::int n, bool_and(validation_status='validated') validated, bool_and(seo_eligible=false) seo_off, bool_and(map_eligible=false) map_off, bool_and(parent_id='city_agadir') parent_ok, bool_and(source_version='registry_v1') source_ok from public.geo_entities where id in ('district_agadir_dakhla','district_agadir_hay_mohammadi')`);
  assert.deepEqual(entity, { n: 2, validated: true, seo_off: true, map_off: true, parent_ok: true, source_ok: true });
  const aliases = await scalar(db, `select count(*)::int n, bool_and(confidence=1) exact_confidence, bool_and(source='registry_v1') source_ok from public.geo_aliases where geo_entity_id in ('district_agadir_dakhla','district_agadir_hay_mohammadi')`);
  assert.deepEqual(aliases, { n: 2, exact_confidence: true, source_ok: true });
  assert.deepEqual(await scalar(db, `select count(*)::int n from public.geo_resolution_events`), { n: 0 });
  await db.close();
});

test("P1B.10 fails closed when parent is not validated", async () => {
  const db = await fixture();
  await db.exec(`update public.geo_entities set validation_status='draft' where id='city_agadir'`);
  await assert.rejects(() => db.exec(APPLY_SQL), /city_agadir parent is missing or not validated/);
  await db.close();
});

test("P1B.10 fails closed on slug, normalized-name and exact-alias collisions", async () => {
  for (const collisionSql of [
    `insert into public.geo_entities values ('collision_slug','neighborhood','city_agadir','dakhla','Other','other','validated',false,false,'registry_v1','{}')`,
    `insert into public.geo_entities values ('collision_name','neighborhood','city_agadir','other','Dakhla','dakhla','validated',false,false,'registry_v1','{}')`,
    `insert into public.geo_entities values ('other_neighborhood','neighborhood','city_agadir','other','Other','other','validated',false,false,'registry_v1','{}'); insert into public.geo_aliases values ('00000000-0000-0000-0000-000000000001','other_neighborhood','Dakhla','dakhla',null,'registry_v1',1)`,
  ]) {
    const db = await fixture();
    await db.exec(collisionSql);
    await assert.rejects(() => db.exec(APPLY_SQL), /collision detected/);
    await db.close();
  }
});

test("P1B.10 exact rollback restores baseline when candidates are still unreferenced", async () => {
  const db = await fixture();
  await db.exec(APPLY_SQL);
  await db.exec(ROLLBACK_SQL);
  assert.deepEqual(await scalar(db, `select count(*)::int n from public.geo_entities`), { n: 1 });
  assert.deepEqual(await scalar(db, `select count(*)::int n from public.geo_aliases`), { n: 0 });
  await db.close();
});

test("P1B.10 rollback refuses every known external Registry dependency", async () => {
  const dependencies = [
    `insert into public.geo_resolution_events(id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id) values ('00000000-0000-0000-0000-000000000009','source_offer_seed','seed-1','resolved',null,'district_agadir_dakhla')`,
    `insert into public.neighborhood_intelligence_profiles values ('profile-1','district_agadir_dakhla')`,
    `insert into public.price_m2_references values ('price-1','district_agadir_dakhla')`,
    `insert into public.geo_entities values ('child','neighborhood','district_agadir_dakhla','child','Child','child','draft',false,false,'registry_v1','{}')`,
  ];
  for (const dependencySql of dependencies) {
    const db = await fixture();
    await db.exec(APPLY_SQL);
    await db.exec(dependencySql);
    await assert.rejects(() => db.exec(ROLLBACK_SQL), /external dependencies exist/);
    assert.deepEqual(await scalar(db, `select count(*)::int n from public.geo_entities where id in ('district_agadir_dakhla','district_agadir_hay_mohammadi')`), { n: 2 });
    await db.close();
  }
});

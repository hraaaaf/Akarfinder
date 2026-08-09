import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260809162000_p1b5_canonical_geo_normalization_recovery.sql"),
  "utf8",
);

describe("P1B.5 — PostgreSQL canonical geo normalization recovery", () => {
  it("recovers only normalization deltas, gates map eligibility, and rolls back append-only", async () => {
    const db = new PGlite();

    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;

      create function odm04_fold_text(p_value text)
      returns text
      language sql
      immutable
      strict
      as $$
        select lower(translate(btrim(p_value),
          'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝŸýÿ',
          'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYYyy'));
      $$;

      create table thin_index_search_documents (
        seed_id uuid primary key,
        vertical_classification text,
        document_kind text,
        display_eligibility text
      );

      create table source_offer_seeds (
        id uuid primary key,
        metadata jsonb not null default '{}'::jsonb
      );

      create table property_listings (
        id bigint primary key,
        city text,
        district text
      );

      create table geo_entities (
        id text primary key,
        entity_type text not null,
        parent_id text,
        validation_status text not null,
        map_eligible boolean not null default false
      );

      create table geo_aliases (
        id uuid primary key default gen_random_uuid(),
        geo_entity_id text not null,
        normalized_alias text not null,
        confidence numeric not null
      );

      create table geo_resolution_events (
        id uuid primary key default gen_random_uuid(),
        raw_city text,
        raw_neighborhood text,
        resolved_city_id text,
        resolved_neighborhood_id text,
        resolution_status text not null,
        candidates jsonb not null default '[]'::jsonb,
        source_record_type text,
        source_record_id text,
        resolver_version text not null,
        created_at timestamptz not null default now()
      );
    `);

    await db.exec(migration);

    const normalized = await db.query<{ value: string }>(`
      select odm_p1b5_normalize_geo_label_v1('  Route de l’Ourika  ') as value
    `);
    assert.equal(normalized.rows[0]?.value, "route de lourika");

    await db.exec(`
      insert into geo_entities (id, entity_type, parent_id, validation_status, map_eligible) values
        ('city-marrakech', 'city', null, 'validated', true),
        ('city-rabat', 'city', null, 'validated', true),
        ('n-gueliz', 'neighborhood', 'city-marrakech', 'validated', true),
        ('n-ourika', 'neighborhood', 'city-marrakech', 'validated', true),
        ('n-ocean', 'neighborhood', 'city-rabat', 'validated', false),
        ('n-maarif', 'neighborhood', 'city-rabat', 'validated', true);

      insert into geo_aliases (geo_entity_id, normalized_alias, confidence) values
        ('city-marrakech', 'marrakech', 1),
        ('city-rabat', 'rabat', 1),
        ('n-gueliz', 'gueliz', 1),
        ('n-ourika', 'route de lourika', 1),
        ('n-ocean', 'ocean', 1),
        ('n-maarif', 'maarif', 1);

      insert into property_listings (id, city, district) values
        (101, 'Marrakech', 'Guéliz'),
        (102, 'Marrakech', 'Route de l''Ourika'),
        (103, 'Rabat', 'Océan'),
        (104, 'Rabat', 'Maarif');

      insert into source_offer_seeds (id, metadata) values
        ('10000000-0000-4000-8000-000000000001', '{"coverage_bridge":{"property_listing_id":101}}'),
        ('10000000-0000-4000-8000-000000000002', '{"coverage_bridge":{"property_listing_id":102}}'),
        ('10000000-0000-4000-8000-000000000003', '{"coverage_bridge":{"property_listing_id":103}}'),
        ('10000000-0000-4000-8000-000000000004', '{"coverage_bridge":{"property_listing_id":104}}');

      insert into thin_index_search_documents (seed_id, vertical_classification, document_kind, display_eligibility) values
        ('10000000-0000-4000-8000-000000000001', 'real_estate_likely', 'LISTING', 'eligible_primary'),
        ('10000000-0000-4000-8000-000000000002', 'real_estate_likely', 'LISTING', 'eligible_secondary'),
        ('10000000-0000-4000-8000-000000000003', 'real_estate_likely', 'LISTING', 'eligible_primary'),
        ('10000000-0000-4000-8000-000000000004', 'real_estate_likely', 'LISTING', 'eligible_primary');
    `);

    const preflight = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b5_geo_normalization_preflight_v1() as report",
    );
    assert.equal(Number(preflight.rows[0]?.report.candidate_count), 3);
    assert.equal(Number(preflight.rows[0]?.report.map_eligible_count), 2);
    assert.equal(Number(preflight.rows[0]?.report.canonical_only_count), 1);

    const candidates = await db.query<{ raw_district: string }>(`
      select raw_district from odm_p1b5_geo_normalization_candidates_v1 order by raw_district
    `);
    assert.deepEqual(
      candidates.rows.map((row) => row.raw_district).sort(),
      ["Guéliz", "Océan", "Route de l'Ourika"].sort(),
    );
    assert.equal(candidates.rows.some((row) => row.raw_district === "Maarif"), false);

    await assert.rejects(
      db.query("select odm_p1b5_geo_normalization_apply_v1(2, 2)"),
      /cohort drift/i,
    );
    await assert.rejects(
      db.query("select odm_p1b5_geo_normalization_apply_v1(3, 1)"),
      /map-eligible drift/i,
    );

    const before = await db.query<{ n: number }>(
      "select count(*)::int as n from geo_resolution_events",
    );
    assert.equal(Number(before.rows[0]?.n), 0);

    const applied = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b5_geo_normalization_apply_v1(3, 2) as report",
    );
    assert.equal(Number(applied.rows[0]?.report.inserted), 3);
    assert.equal(Number(applied.rows[0]?.report.map_eligible_inserted), 2);
    assert.equal(Number(applied.rows[0]?.report.canonical_only_inserted), 1);

    const afterApplyPreflight = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b5_geo_normalization_preflight_v1() as report",
    );
    assert.equal(Number(afterApplyPreflight.rows[0]?.report.candidate_count), 0);

    const rollback = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b5_geo_normalization_rollback_v1(3) as report",
    );
    assert.equal(Number(rollback.rows[0]?.report.unresolved_events_inserted), 3);

    const latest = await db.query<{ resolution_status: string }>(`
      select distinct on (source_record_id) resolution_status
      from geo_resolution_events
      where source_record_type='source_offer_seed'
      order by source_record_id, created_at desc, id desc
    `);
    assert.deepEqual(latest.rows.map((row) => row.resolution_status), ["unresolved", "unresolved", "unresolved"]);

    const history = await db.query<{ resolved: number; unresolved: number }>(`
      select
        count(*) filter (where resolution_status='resolved')::int as resolved,
        count(*) filter (where resolution_status='unresolved')::int as unresolved
      from geo_resolution_events
    `);
    assert.equal(Number(history.rows[0]?.resolved), 3);
    assert.equal(Number(history.rows[0]?.unresolved), 3);

    await db.close();
  });
});

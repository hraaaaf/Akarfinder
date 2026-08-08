import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260808120000_p1b4_geo_coverage_recovery.sql"),
  "utf8",
);

describe("P1B.4 — PostgreSQL geo coverage recovery", () => {
  it("applies exact explicit evidence, fails closed on drift, and rolls back append-only", async () => {
    const db = new PGlite();

    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;

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
        validation_status text not null
      );

      create table geo_aliases (
        id uuid primary key default gen_random_uuid(),
        geo_entity_id text not null,
        normalized_alias text not null
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

    await db.exec(`
      insert into geo_entities (id, entity_type, parent_id, validation_status) values
        ('city-casa', 'city', null, 'validated'),
        ('n-maarif', 'neighborhood', 'city-casa', 'validated'),
        ('n-anfa', 'neighborhood', 'city-casa', 'validated');

      insert into geo_aliases (geo_entity_id, normalized_alias) values
        ('city-casa', 'casablanca'),
        ('n-maarif', 'maarif'),
        ('n-anfa', 'anfa');

      insert into property_listings (id, city, district) values
        (101, 'Casablanca', 'Maarif'),
        (102, 'Casablanca', 'Anfa');

      insert into source_offer_seeds (id, metadata) values
        ('10000000-0000-4000-8000-000000000001', '{"coverage_bridge":{"property_listing_id":101}}'),
        ('10000000-0000-4000-8000-000000000002', '{"coverage_bridge":{"property_listing_id":102}}');

      insert into thin_index_search_documents (seed_id, vertical_classification, document_kind, display_eligibility) values
        ('10000000-0000-4000-8000-000000000001', 'real_estate_likely', 'LISTING', 'eligible_primary'),
        ('10000000-0000-4000-8000-000000000002', 'real_estate_likely', 'LISTING', 'eligible_secondary');
    `);

    const preflight = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b4_geo_recovery_preflight_v1() as report",
    );
    assert.equal(Number(preflight.rows[0]?.report.candidate_count), 2);

    await assert.rejects(
      db.query("select odm_p1b4_geo_recovery_apply_v1(1)"),
      /cohort drift/i,
    );

    const before = await db.query<{ n: number }>(
      "select count(*)::int as n from geo_resolution_events",
    );
    assert.equal(Number(before.rows[0]?.n), 0);

    const applied = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b4_geo_recovery_apply_v1(2) as report",
    );
    assert.equal(Number(applied.rows[0]?.report.inserted), 2);

    const resolved = await db.query<{ n: number }>(
      "select count(*)::int as n from geo_resolution_events where resolver_version='p1b4_exact_bridge_v1' and resolution_status='resolved'",
    );
    assert.equal(Number(resolved.rows[0]?.n), 2);

    const afterApplyPreflight = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b4_geo_recovery_preflight_v1() as report",
    );
    assert.equal(Number(afterApplyPreflight.rows[0]?.report.candidate_count), 0);

    const rollback = await db.query<{ report: Record<string, unknown> }>(
      "select odm_p1b4_geo_recovery_rollback_v1(2) as report",
    );
    assert.equal(Number(rollback.rows[0]?.report.unresolved_events_inserted), 2);

    const latest = await db.query<{ resolution_status: string }>(`
      select distinct on (source_record_id) resolution_status
      from geo_resolution_events
      where source_record_type='source_offer_seed'
      order by source_record_id, created_at desc, id desc
    `);
    assert.deepEqual(latest.rows.map((row) => row.resolution_status), ["unresolved", "unresolved"]);

    const history = await db.query<{ resolved: number; unresolved: number }>(`
      select
        count(*) filter (where resolution_status='resolved')::int as resolved,
        count(*) filter (where resolution_status='unresolved')::int as unresolved
      from geo_resolution_events
    `);
    assert.equal(Number(history.rows[0]?.resolved), 2);
    assert.equal(Number(history.rows[0]?.unresolved), 2);

    await db.close();
  });
});

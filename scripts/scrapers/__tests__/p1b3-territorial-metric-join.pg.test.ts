import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260808101500_p1b3_territorial_metric_join_contract.sql"),
  "utf8",
);

describe("P1B.3 — PostgreSQL territorial metric join", () => {
  it("executes the contract and measures latest truth, collisions and one public denominator", async () => {
    const db = new PGlite();

    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;

      create table geo_entities (
        id uuid primary key,
        slug text not null,
        canonical_name text not null,
        parent_id uuid,
        entity_type text not null,
        validation_status text not null
      );

      create table geo_resolution_events (
        id bigint primary key,
        source_record_id text not null,
        source_record_type text not null,
        resolution_status text not null,
        resolved_city_id uuid,
        resolved_neighborhood_id uuid,
        resolver_version text,
        created_at timestamptz not null
      );

      create table thin_index_search_documents (
        seed_id uuid primary key,
        normalized_city text,
        freshness_status text,
        quality_score numeric,
        quality_tier text,
        display_eligibility text,
        vertical_classification text,
        document_kind text
      );
    `);

    await db.exec(migration);

    await db.exec(`
      insert into geo_entities (id, slug, canonical_name, parent_id, entity_type, validation_status) values
        ('00000000-0000-4000-8000-000000000001', 'casablanca', 'Casablanca', null, 'city', 'validated'),
        ('00000000-0000-4000-8000-000000000011', 'maarif', 'Maârif', '00000000-0000-4000-8000-000000000001', 'neighborhood', 'validated'),
        ('00000000-0000-4000-8000-000000000012', 'anfa', 'Anfa', '00000000-0000-4000-8000-000000000001', 'neighborhood', 'validated');

      insert into thin_index_search_documents
        (seed_id, normalized_city, freshness_status, quality_score, quality_tier, display_eligibility, vertical_classification, document_kind)
      values
        ('10000000-0000-4000-8000-000000000001', 'Casablanca', 'fresh_confirmed', 90, 'A', 'eligible_primary', 'real_estate_likely', 'LISTING'),
        ('10000000-0000-4000-8000-000000000002', 'Casablanca', 'fresh_confirmed', 80, 'B', 'eligible_secondary', 'real_estate_likely', 'LISTING'),
        ('10000000-0000-4000-8000-000000000003', 'Casablanca', 'fresh_confirmed', 70, 'B', 'eligible_secondary', 'real_estate_likely', 'LISTING'),
        ('10000000-0000-4000-8000-000000000004', 'Casablanca', 'fresh_confirmed', 60, 'C', 'not_eligible', 'real_estate_likely', 'LISTING');

      -- Seed 1: stale resolved history followed by a newer unresolved event => must fail closed.
      insert into geo_resolution_events values
        (1, '10000000-0000-4000-8000-000000000001', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'v1', '2026-08-01T10:00:00Z'),
        (2, '10000000-0000-4000-8000-000000000001', 'source_offer_seed', 'unresolved', null, null, 'v2', '2026-08-02T10:00:00Z');

      -- Seed 2: two conflicting latest resolutions at the same timestamp => collision must be visible.
      insert into geo_resolution_events values
        (3, '10000000-0000-4000-8000-000000000002', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'v2', '2026-08-03T10:00:00Z'),
        (4, '10000000-0000-4000-8000-000000000002', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'v2', '2026-08-03T10:00:00Z');

      -- Seed 3: one clean current resolution => admitted.
      insert into geo_resolution_events values
        (5, '10000000-0000-4000-8000-000000000003', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'v2', '2026-08-04T10:00:00Z');

      -- Seed 4: conflicting but not public/displayable => must not pollute collision metrics.
      insert into geo_resolution_events values
        (6, '10000000-0000-4000-8000-000000000004', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'v2', '2026-08-05T10:00:00Z'),
        (7, '10000000-0000-4000-8000-000000000004', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'v2', '2026-08-05T10:00:00Z'),
        (8, 'not-a-uuid', 'source_offer_seed', 'resolved', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'v2', '2026-08-06T10:00:00Z');
    `);

    const joined = await db.query<{ seed_id: string }>(
      "select seed_id::text as seed_id from odm_territorial_metric_listing_join_v1 order by seed_id",
    );
    assert.deepEqual(
      joined.rows.map((row) => row.seed_id),
      [
        "10000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000003",
      ],
    );

    const result = await db.query<{ report: Record<string, unknown> }>(
      "select odm_territorial_metric_join_report_v1() as report",
    );
    const report = result.rows[0]?.report as {
      eligible_public_listings: number;
      resolved_neighborhood_listings: number;
      coverage_percent: number;
      latest_resolution_collisions: number;
      conflicting_resolution_history: number;
      metric_layers_activated: boolean;
      gates: Record<string, boolean>;
    };

    assert.equal(Number(report.eligible_public_listings), 3);
    assert.equal(Number(report.resolved_neighborhood_listings), 2);
    assert.equal(Number(report.coverage_percent), 66.67);
    assert.equal(Number(report.latest_resolution_collisions), 1);
    assert.equal(Number(report.conflicting_resolution_history), 1);
    assert.equal(report.metric_layers_activated, false);
    assert.equal(report.gates.latest_event_must_be_resolved, true);
    assert.equal(report.gates.no_latest_resolution_collision, false);
    assert.equal(report.gates.same_public_listing_denominator, true);

    await db.close();
  });
});

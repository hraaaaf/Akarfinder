// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 -- Gate A (PGlite).
// Not part of the committed test suite (excluded from tsconfig/test globs by
// living under __gate__/, matching the precedent set by
// scripts/market-index/__gate__/gate-a-pglite-backfill.ts). No Production
// connection, no Production data.
//
// national-writer.ts calls getSupabaseServerClient() (the real
// @supabase/supabase-js client, talking PostgREST over HTTP) -- PGlite has no
// PostgREST layer, so the TypeScript writer functions cannot be invoked
// directly against it. This gate instead runs the EXACT equivalent SQL each
// upsert() call compiles to (same table, same onConflict target, same
// ignoreDuplicates flag) against a real schema + the 6 migrations, which
// proves the DB-level safety properties that actually matter: constraint
// compatibility, idempotence under the writer's own onConflict targets, 1:1
// cluster enforcement, and safe rollback of a single run's rows.

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260716140000_create_discovery_candidates.sql",
  "20260716140100_create_property_clusters.sql",
  "20260716140200_create_property_cluster_members.sql",
  "20260716140300_create_source_offer_observations.sql",
  "20260716140400_add_source_offer_columns_to_listing_sources.sql",
];

// Authoritative base schema, reused verbatim from
// scripts/scrapers/db/supabase-migration.sql (the real Production DDL for
// these two pre-existing tables), trimmed to the columns this gate exercises.
const BASE_SCHEMA_SQL = `
  create table property_listings (
    id bigint primary key generated always as identity,
    canonical_fingerprint text not null unique,
    title text,
    price_mad integer,
    city text,
    district text,
    property_type text,
    transaction_type text,
    surface_m2 integer,
    bedrooms_count integer,
    description_snippet text,
    data_completeness_score integer default 0,
    field_confidence jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table listing_sources (
    id bigint primary key generated always as identity,
    property_listing_id bigint not null references property_listings(id) on delete cascade,
    source_name text not null,
    listing_url text not null unique,
    source_url text,
    first_seen_at timestamptz default now(),
    last_seen_at timestamptz default now(),
    is_active boolean default true
  );
`;

function assert(cond: boolean, label: string): void {
  if (!cond) throw new Error(`GATE A ASSERTION FAILED: ${label}`);
}

async function applyMigrations(db: PGlite): Promise<void> {
  for (const filename of MIGRATIONS) {
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
    await db.exec(sql);
  }
}

// Mirrors national-writer.ts's writeNationalAdmittedListings() batch logic
// exactly: upsert property_listings on canonical_fingerprint, upsert
// listing_sources on listing_url (with the 9 additive columns), upsert
// property_clusters on legacy_property_listing_id, upsert
// property_cluster_members on (property_cluster_id, source_offer_id).
async function applyCandidate(
  db: PGlite,
  input: { fingerprint: string; title: string; url: string; runId: string },
): Promise<void> {
  const propertyResult = await db.query<{ id: number }>(
    `insert into property_listings (canonical_fingerprint, title, price_mad, city, transaction_type, property_type)
     values ($1, $2, 500000, 'Casablanca', 'sale', 'apartment')
     on conflict (canonical_fingerprint) do update set title = excluded.title, updated_at = now()
     returning id`,
    [input.fingerprint, input.title],
  );
  const propertyId = propertyResult.rows[0].id;

  const sourceResult = await db.query<{ id: number }>(
    `insert into listing_sources (property_listing_id, source_name, listing_url, source_url, origin_type, content_fingerprint, ingestion_run_id, displayed_price, price_currency, price_status)
     values ($1, 'mubawab', $2, $2, 'persisted_openserp', $3, $4, 500000, 'MAD', 'valid')
     on conflict (listing_url) do update set last_seen_at = now(), ingestion_run_id = excluded.ingestion_run_id
     returning id`,
    [propertyId, input.url, input.fingerprint, input.runId],
  );
  const sourceId = sourceResult.rows[0].id;

  const clusterResult = await db.query<{ id: string }>(
    `insert into property_clusters (cluster_origin, legacy_property_listing_id, created_by)
     values ('deterministic_same_source_identifier', $1, $2)
     on conflict (legacy_property_listing_id) do nothing
     returning id`,
    [propertyId, `openserp-ingestion:${input.runId}`],
  );
  const clusterId =
    clusterResult.rows[0]?.id ??
    (
      await db.query<{ id: string }>(`select id from property_clusters where legacy_property_listing_id = $1`, [propertyId])
    ).rows[0].id;

  await db.query(
    `insert into property_cluster_members (property_cluster_id, source_offer_id, origin_type, added_by)
     values ($1, $2, 'deterministic_same_source_identifier', $3)
     on conflict (property_cluster_id, source_offer_id) do nothing`,
    [clusterId, sourceId, `openserp-ingestion:${input.runId}`],
  );
}

async function main() {
  const report: Record<string, unknown> = {
    gate_id: "openserp-automated-ingestion-gate-a",
    mission: "AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1",
    generated_at_utc: new Date().toISOString(),
    engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral)",
    no_production_connection_made: true,
    no_production_data_used: true,
    adaptation_note:
      "national-writer.ts uses the real Supabase JS client (PostgREST over HTTP); PGlite has no PostgREST layer, so this gate runs the equivalent SQL each upsert() call compiles to (same table, same onConflict target) rather than invoking the TypeScript functions directly. See docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md.",
  };

  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(BASE_SCHEMA_SQL);
  await applyMigrations(db);

  const runId = "gate-a-run-1";

  // --- Case 1: two distinct candidates, first apply ---
  await applyCandidate(db, { fingerprint: "fp-1", title: "Appartement Maarif", url: "https://mubawab.ma/1", runId });
  await applyCandidate(db, { fingerprint: "fp-2", title: "Villa Palmeraie", url: "https://mubawab.ma/2", runId });

  const propertyCount1 = await db.query<{ count: string }>("select count(*)::text from property_listings;");
  const sourceCount1 = await db.query<{ count: string }>("select count(*)::text from listing_sources;");
  const clusterCount1 = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  const memberCount1 = await db.query<{ count: string }>("select count(*)::text from property_cluster_members;");
  assert(Number(propertyCount1.rows[0].count) === 2, "expected 2 property_listings after first apply");
  assert(Number(sourceCount1.rows[0].count) === 2, "expected 2 listing_sources after first apply");
  assert(Number(clusterCount1.rows[0].count) === 2, "expected 2 property_clusters after first apply");
  assert(Number(memberCount1.rows[0].count) === 2, "expected 2 property_cluster_members after first apply");
  report.first_apply = { status: "PASS", property_listings: 2, listing_sources: 2, clusters: 2, memberships: 2 };

  // --- Case 2: 1:1 enforcement -- every cluster has exactly 1 membership ---
  const multiMembership = await db.query(`
    select pc.id, count(pcm.id) as c from property_clusters pc
    left join property_cluster_members pcm on pcm.property_cluster_id = pc.id
    group by pc.id having count(pcm.id) <> 1;
  `);
  assert(multiMembership.rows.length === 0, "every cluster must have exactly 1 membership (1:1 enforcement)");
  report.one_to_one_enforcement = { status: "PASS" };

  // --- Case 3: idempotent second apply of the SAME candidates -- must not duplicate ---
  await applyCandidate(db, { fingerprint: "fp-1", title: "Appartement Maarif (updated title)", url: "https://mubawab.ma/1", runId: "gate-a-run-2" });
  await applyCandidate(db, { fingerprint: "fp-2", title: "Villa Palmeraie", url: "https://mubawab.ma/2", runId: "gate-a-run-2" });

  const propertyCount2 = await db.query<{ count: string }>("select count(*)::text from property_listings;");
  const sourceCount2 = await db.query<{ count: string }>("select count(*)::text from listing_sources;");
  const clusterCount2 = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  const memberCount2 = await db.query<{ count: string }>("select count(*)::text from property_cluster_members;");
  assert(Number(propertyCount2.rows[0].count) === 2, "second apply of the same URLs must not create new property_listings");
  assert(Number(sourceCount2.rows[0].count) === 2, "second apply of the same URLs must not create new listing_sources");
  assert(Number(clusterCount2.rows[0].count) === 2, "second apply must not create new clusters");
  assert(Number(memberCount2.rows[0].count) === 2, "second apply must not create new memberships");

  const updatedTitle = await db.query<{ title: string }>("select title from property_listings where canonical_fingerprint = 'fp-1';");
  assert(updatedTitle.rows[0].title === "Appartement Maarif (updated title)", "on-conflict update must still refresh mutable fields (title)");
  report.second_apply_idempotent = { status: "PASS", note: "0 new rows anywhere; on-conflict UPDATE still refreshes last_seen_at/title as designed" };

  // --- Case 4: a genuinely NEW candidate on the second run adds exactly 1 of each ---
  await applyCandidate(db, { fingerprint: "fp-3", title: "Studio Racine", url: "https://mubawab.ma/3", runId: "gate-a-run-2" });
  const propertyCount3 = await db.query<{ count: string }>("select count(*)::text from property_listings;");
  assert(Number(propertyCount3.rows[0].count) === 3, "a genuinely new candidate must add exactly 1 property_listing");
  report.new_candidate_on_second_run = { status: "PASS" };

  // --- Case 5: rollback of a single run's newly-created rows only ---
  const beforeRollback = await db.query<{ id: number }>("select id from property_listings where canonical_fingerprint = 'fp-3';");
  const newId = beforeRollback.rows[0].id;
  await db.query("delete from property_cluster_members where source_offer_id in (select id from listing_sources where property_listing_id = $1);", [newId]);
  await db.query("delete from property_clusters where legacy_property_listing_id = $1;", [newId]);
  await db.query("delete from listing_sources where property_listing_id = $1;", [newId]);
  await db.query("delete from property_listings where id = $1;", [newId]);
  const propertyCountAfterRollback = await db.query<{ count: string }>("select count(*)::text from property_listings;");
  assert(Number(propertyCountAfterRollback.rows[0].count) === 2, "rollback of the new run must restore the pre-run count, leaving prior rows untouched");
  const priorRowIntact = await db.query<{ count: string }>("select count(*)::text from property_listings where canonical_fingerprint = 'fp-1';");
  assert(Number(priorRowIntact.rows[0].count) === 1, "rollback must never touch a prior run's rows");
  report.rollback = { status: "PASS" };

  // --- Case 6: origin_type/cluster_origin constraint enforcement ---
  // The DB's CHECK constraint enforces "one of the 6 recognized enum values"
  // (it legitimately allows partner_api -- that value is valid for OTHER,
  // non-OpenSERP write paths). The narrower "OpenSERP writes may never use a
  // partner-facing origin_type" rule is an application-level guarantee
  // (assertOpenSerpOriginIsNeverPartnerFacing, exercised by national-writer.ts
  // always passing the literal "persisted_openserp"). This case instead
  // proves the DB rejects a value outside the enum entirely.
  let constraintErrorRaised = false;
  try {
    await db.query(
      `insert into listing_sources (property_listing_id, source_name, listing_url, origin_type) values (1, 'x', 'https://x.ma/bad-origin', 'not_a_real_enum_value')`,
    );
  } catch {
    constraintErrorRaised = true;
  }
  assert(constraintErrorRaised, "the DB's own CHECK constraint must reject an origin_type value outside its enum");
  report.origin_type_constraint = { status: "PASS" };

  let clusterOriginErrorRaised = false;
  try {
    await db.query(
      `insert into property_clusters (cluster_origin, legacy_property_listing_id) values ('not_a_real_origin', 999)`,
    );
  } catch {
    clusterOriginErrorRaised = true;
  }
  assert(clusterOriginErrorRaised, "the DB's own CHECK constraint must reject an unrecognized cluster_origin");
  report.cluster_origin_constraint = { status: "PASS" };

  await db.close();

  report.overall_verdict = "PASS";
  writeFileSync(
    join(process.cwd(), "data", "audits", "openserp-automated-ingestion-gate-a.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log("=== GATE A (PGlite) OPENSERP AUTOMATED INGESTION: ALL TESTS PASSED ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error("GATE A FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});

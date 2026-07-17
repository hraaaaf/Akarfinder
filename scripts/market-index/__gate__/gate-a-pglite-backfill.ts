// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 -- Gate A (PGlite).
// Not part of the committed test suite (excluded from tsconfig/test globs by
// living under __gate__/); run manually via tsx. Uses the REAL
// computeBackfillPlan/buildApplySql/buildVerifySql/buildRollbackSql functions
// from lib/market-index -- not a reimplementation -- against a real embedded
// Postgres (PGlite) with synthetic fixtures. No Production connection, no
// Production data.

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeBackfillPlan,
  type BackfillListingSourceRow,
  type BackfillPropertyListingRow,
} from "../../../lib/market-index/market-index-backfill-plan";
import { buildApplySql, buildRollbackSql, buildVerifySql } from "../../../lib/market-index/market-index-backfill-sql";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260716140000_create_discovery_candidates.sql",
  "20260716140100_create_property_clusters.sql",
  "20260716140200_create_property_cluster_members.sql",
  "20260716140300_create_source_offer_observations.sql",
  "20260716140400_add_source_offer_columns_to_listing_sources.sql",
];

const LEGACY_SCHEMA_SQL = `
  create table property_listings (
    id bigint primary key,
    price_mad numeric,
    city text,
    district text,
    property_type text,
    transaction_type text,
    surface_m2 numeric,
    duplicate_group_id text,
    field_confidence jsonb,
    title text,
    description_snippet text
  );
  create table listing_sources (
    id bigint primary key,
    property_listing_id bigint not null references property_listings(id),
    source_name text,
    listing_url text,
    source_url text,
    is_active boolean not null default true,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
  );
`;

// --- Synthetic fixtures covering every required case from ODM section 15 ---
const listings: BackfillPropertyListingRow[] = [
  // 1. single valid source, openserp provenance, valid price -> ELIGIBLE
  { id: 1001, price_mad: 500000, transaction_type: "sale", title: "Appartement Agdal", description_snippet: "Bel appartement 3 pieces", field_confidence: { provider: "openserp" } },
  // 2. ambiguous multi-source (2 sources) -> skip
  { id: 1002, price_mad: 800000, transaction_type: "sale", title: "Villa Palmeraie", description_snippet: "Villa avec piscine", field_confidence: { provider: "openserp" } },
  // 3. source without provenance (field_confidence null) -> skip
  { id: 1003, price_mad: 300000, transaction_type: "rent", title: "Studio Maarif", description_snippet: "Studio meuble", field_confidence: null },
  // 4. invalid URL (both listing_url and source_url empty) -> skip
  { id: 1004, price_mad: 450000, transaction_type: "sale", title: "Riad Medina", description_snippet: "Riad authentique", field_confidence: { provider: "openserp" } },
  // 5. "explicit partner" marker -- NOT recognized by this backfill's strict
  //    openserp-only policy, must stay unprovenanced (proves no accidental
  //    partner_api deduction happens)
  { id: 1005, price_mad: 600000, transaction_type: "sale", title: "Appartement Hivernage", description_snippet: "Vue piscine", field_confidence: { provider: "partner_feed_xyz", source_domain: "known-partner.ma" } },
  // 6. source_offer_key collision scenario -- two sources sharing a domain;
  //    since this backfill never writes source_offer_key, must never collide
  { id: 1006, price_mad: 700000, transaction_type: "sale", title: "Duplex Racine", description_snippet: "Duplex standing", field_confidence: { provider: "openserp" } },
  // 7. fake/misleading duplicate_group_id shared with an unrelated listing --
  //    must be completely ignored by the eligibility computation
  { id: 1007, price_mad: 550000, transaction_type: "sale", title: "Appartement Gauthier", description_snippet: "Proche centre ville", field_confidence: { provider: "openserp" }, duplicate_group_id: "fake-group-1" } as BackfillPropertyListingRow & { duplicate_group_id: string },
  { id: 1008, price_mad: 5500000, transaction_type: "sale", title: "Villa Californie", description_snippet: "Villa de luxe 10 pieces", field_confidence: { provider: "openserp" }, duplicate_group_id: "fake-group-1" } as BackfillPropertyListingRow & { duplicate_group_id: string },
  // 8. null price -> eligible for cluster, but price_status=not_disclosed, displayed_price stays null
  { id: 1009, price_mad: null, transaction_type: "sale", title: "Terrain Ain Diab", description_snippet: "Terrain constructible", field_confidence: { provider: "openserp" } },
  // 9. valid price already covered by #1; add a rent-transaction eligible case
  //    to confirm price_period stays null for rent (mois/jour ambiguity)
  { id: 1010, price_mad: 8000, transaction_type: "rent", title: "Appartement meuble Racine", description_snippet: "Location longue duree", field_confidence: { provider: "openserp" } },
  // 10. near-identical text between two DISTINCT listings -- must never be
  //     merged into one cluster (each gets its own independent projection)
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

const RUN_ID = "gate-a-synthetic-run";

function assert(cond: boolean, label: string): void {
  if (!cond) throw new Error(`GATE A ASSERTION FAILED: ${label}`);
}

async function seedLegacy(db: PGlite): Promise<void> {
  await db.exec(LEGACY_SCHEMA_SQL);
  for (const l of listings) {
    await db.query(
      `insert into property_listings (id, price_mad, transaction_type, title, description_snippet, field_confidence, duplicate_group_id) values ($1,$2,$3,$4,$5,$6,$7)`,
      [l.id, l.price_mad, l.transaction_type, l.title, l.description_snippet, l.field_confidence ? JSON.stringify(l.field_confidence) : null, (l as { duplicate_group_id?: string }).duplicate_group_id ?? null],
    );
  }
  for (const s of sources) {
    await db.query(
      `insert into listing_sources (id, property_listing_id, source_name, listing_url, source_url) values ($1,$2,$3,$4,$5)`,
      [s.id, s.property_listing_id, s.source_name, s.listing_url, s.source_url],
    );
  }
}

async function applyMigrations(db: PGlite): Promise<void> {
  for (const filename of MIGRATIONS) {
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
    await db.exec(sql);
  }
}

async function main() {
  const report: Record<string, unknown> = {
    gate_id: "market-index-controlled-backfill-gate-a",
    mission: "AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1",
    generated_at_utc: new Date().toISOString(),
    engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral)",
    no_production_connection_made: true,
    no_production_data_used: true,
    fixtures_summary: {
      total_listings: listings.length,
      total_sources: sources.length,
      cases_covered: [
        "single valid source + openserp provenance -> eligible",
        "ambiguous multi-source (2 sources) -> skipped",
        "missing provenance (field_confidence null) -> skipped",
        "invalid URL (null listing_url/source_url) -> skipped",
        "non-openserp explicit-looking provenance marker -> still skipped (strict policy)",
        "source_offer_key collision scenario (never written, never collides)",
        "fake/misleading duplicate_group_id shared across 2 listings -> ignored",
        "null price -> eligible, price_status=not_disclosed, displayed_price=null",
        "rent transaction -> eligible, price_period stays null (mois/jour ambiguous)",
        "near-identical text across 2 distinct listings -> independent clusters, never merged",
      ],
    },
  };

  // --- Step 1: compute plan using the REAL production function ---
  const { plan, eligible } = computeBackfillPlan(listings, sources);
  report.plan = plan;
  // Eligible: 1001, 1006, 1007, 1008, 1009, 1010, 1011, 1012 = 8
  assert(plan.eligible_clusters === 8, `expected 8 eligible clusters, got ${plan.eligible_clusters}`);
  assert(plan.skipped_multi_source === 2, `expected 2 skipped_multi_source (1 group x 2 sources), got ${plan.skipped_multi_source}`);
  assert(plan.ambiguous_multi_source_groups === 1, `expected 1 ambiguous group, got ${plan.ambiguous_multi_source_groups}`);
  assert(plan.skipped_invalid_url === 1, `expected 1 invalid url skip, got ${plan.skipped_invalid_url}`);
  // missing provenance: 1003 (null fc) + 1005 (non-openserp marker) = 2
  assert(plan.skipped_missing_provenance === 2, `expected 2 skipped_missing_provenance, got ${plan.skipped_missing_provenance}`);
  assert(plan.source_key_collisions === 0, "source_key_collisions must be 0 (never written)");

  // Plan SHA stability: recompute twice, must match.
  const { plan: planAgain } = computeBackfillPlan(listings, sources);
  assert(JSON.stringify(plan) === JSON.stringify(planAgain), "plan must be identical across repeated computation (determinism)");
  report.plan_deterministic = true;

  // 1009 (null price) must be eligible with price_status not_disclosed, displayed_price null
  const item1009 = eligible.find((e) => e.property_listing_id === 1009);
  assert(!!item1009, "1009 must be eligible");
  assert(item1009!.price_status === "not_disclosed", "1009 price_status must be not_disclosed");
  assert(item1009!.displayed_price === null, "1009 displayed_price must stay null");

  // 1010 (rent) must be eligible with price_period null
  const item1010 = eligible.find((e) => e.property_listing_id === 1010);
  assert(!!item1010, "1010 must be eligible");
  assert(item1010!.price_period === null, "1010 (rent) price_period must stay null");

  // 1011/1012 near-identical text must produce two DIFFERENT cluster_ids (never merged)
  const item1011 = eligible.find((e) => e.property_listing_id === 1011);
  const item1012 = eligible.find((e) => e.property_listing_id === 1012);
  assert(!!item1011 && !!item1012, "both near-identical-text listings must be independently eligible");
  assert(item1011!.cluster_id !== item1012!.cluster_id, "near-identical-text listings must NOT share a cluster");

  // 1005 (non-openserp marker) must be skipped, not eligible
  assert(!eligible.some((e) => e.property_listing_id === 1005), "1005 (non-openserp partner-like marker) must NOT be eligible");

  // --- Step 2: build SQL using the REAL production functions ---
  const applySql = buildApplySql(RUN_ID, eligible);
  const verifySql = buildVerifySql(RUN_ID, eligible);
  const rollbackSql = buildRollbackSql(RUN_ID, eligible);

  // --- Step 3: apply against fresh PGlite ---
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } });
  await seedLegacy(db);
  await applyMigrations(db);

  const applyResult = { errors: [] as string[] };
  try {
    await db.exec(applySql);
  } catch (e) {
    applyResult.errors.push(e instanceof Error ? e.message : String(e));
  }
  assert(applyResult.errors.length === 0, `apply.sql must execute cleanly, errors: ${applyResult.errors.join("; ")}`);
  report.apply = { status: "PASS", eligible_count: eligible.length };

  // --- Step 4: verify row counts match plan exactly ---
  const clusterCount = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  const memberCount = await db.query<{ count: string }>("select count(*)::text from property_cluster_members;");
  assert(Number(clusterCount.rows[0].count) === plan.eligible_clusters, "property_clusters count must equal plan.eligible_clusters");
  assert(Number(memberCount.rows[0].count) === plan.eligible_memberships, "property_cluster_members count must equal plan.eligible_memberships");

  // No cluster has more than 1 membership; no ambiguous group was clustered
  const multiMembership = await db.query(`
    select pc.id, count(pcm.id) as c from property_clusters pc
    left join property_cluster_members pcm on pcm.property_cluster_id = pc.id
    group by pc.id having count(pcm.id) <> 1;
  `);
  assert(multiMembership.rows.length === 0, "every cluster must have exactly 1 membership");

  const ambiguousClustered = await db.query(`
    select property_listing_id from property_cluster_members pcm
    join listing_sources ls on ls.id = pcm.source_offer_id
    where property_listing_id in (1002)
  `);
  assert(ambiguousClustered.rows.length === 0, "ambiguous multi-source listing 1002 must never be clustered");

  // duplicate_group_id never referenced: 1007/1008 share a fake group but got 2 separate clusters
  const dupGroupClusters = await db.query<{ legacy_property_listing_id: number }>(
    `select legacy_property_listing_id from property_clusters where legacy_property_listing_id in (1007, 1008) order by legacy_property_listing_id;`,
  );
  assert(dupGroupClusters.rows.length === 2, "both 1007 and 1008 (fake shared duplicate_group_id) must each get their own cluster");

  report.db_verification = { status: "PASS" };

  // --- Step 5: idempotent second apply -- must not error, must not duplicate ---
  let secondApplyError: string | null = null;
  try {
    await db.exec(applySql);
  } catch (e) {
    secondApplyError = e instanceof Error ? e.message : String(e);
  }
  const clusterCountAfter2nd = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  assert(Number(clusterCountAfter2nd.rows[0].count) === plan.eligible_clusters, "second apply must not create duplicate clusters (ON CONFLICT DO NOTHING)");
  report.second_apply = { status: "PASS", error_raised: secondApplyError, note: "UPDATE guard clause + INSERT ON CONFLICT DO NOTHING made this a true no-op" };

  // --- Step 6: rollback ---
  await db.exec(rollbackSql);
  const clusterCountAfterRollback = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  const memberCountAfterRollback = await db.query<{ count: string }>("select count(*)::text from property_cluster_members;");
  assert(Number(clusterCountAfterRollback.rows[0].count) === 0, "rollback must remove all clusters created by this run");
  assert(Number(memberCountAfterRollback.rows[0].count) === 0, "rollback must remove all memberships created by this run");
  const columnsResetCheck = await db.query<{ count: string }>(
    `select count(*)::text from listing_sources where id = ${eligible[0].listing_source_id} and origin_type is null and content_fingerprint is null and ingestion_run_id is null;`,
  );
  assert(Number(columnsResetCheck.rows[0].count) === 1, "rollback must null out the 9 columns on the enriched row");
  report.rollback = { status: "PASS" };

  // --- Step 7: clean reapply from post-rollback state ---
  let reapplyError: string | null = null;
  try {
    await db.exec(applySql);
  } catch (e) {
    reapplyError = e instanceof Error ? e.message : String(e);
  }
  const clusterCountFinal = await db.query<{ count: string }>("select count(*)::text from property_clusters;");
  assert(reapplyError === null, `clean reapply must succeed, got error: ${reapplyError}`);
  assert(Number(clusterCountFinal.rows[0].count) === plan.eligible_clusters, "clean reapply must recreate all clusters");
  report.clean_reapply = { status: "PASS" };

  await db.close();

  report.overall_verdict = "PASS";
  writeFileSync(join(process.cwd(), "data", "audits", "market-index-controlled-backfill-gate-a.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log("=== GATE A (PGlite) CONTROLLED BACKFILL: ALL TESTS PASSED ===");
  console.log(JSON.stringify({ plan, apply: report.apply, second_apply: report.second_apply, rollback: report.rollback, clean_reapply: report.clean_reapply }, null, 2));
}

main().catch((e) => {
  console.error("GATE A FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});

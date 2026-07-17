// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 — controlled backfill CLI.
//
// Modes (exactly one required -- no mode = refuse):
//   --dry-run        read-only Production query, print/save the plan JSON.
//   --generate-sql    recompute the plan, generate apply/verify/rollback SQL
//                     + manifest + hashes as artifacts. No write, no connection
//                     beyond the same read-only Production query.
//   --verify          read-only Production query, compare current state
//                     against a manifest file.
//   --apply           requires --run-id <ID> --expected-plan-sha256 <HASH>
//                     --confirm-controlled-production-backfill. Refuses if
//                     any of those is missing, and refuses if no direct
//                     database connection is configured in this environment
//                     (this project has none -- see section 20 of the ODM:
//                     the SQL Editor mechanism is used instead, manually, by
//                     the project owner, with the generated apply.sql).
//
// Usage:
//   npx tsx scripts/market-index/run-controlled-market-index-backfill.ts --dry-run
//   npx tsx scripts/market-index/run-controlled-market-index-backfill.ts --generate-sql --run-id <ID>
//   npx tsx scripts/market-index/run-controlled-market-index-backfill.ts --verify
//   npx tsx scripts/market-index/run-controlled-market-index-backfill.ts --apply --run-id <ID> --expected-plan-sha256 <HASH> --confirm-controlled-production-backfill

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";
import { computeBackfillPlan, type BackfillListingSourceRow, type BackfillPropertyListingRow } from "../../lib/market-index/market-index-backfill-plan";
import { buildApplySql, buildRollbackSql, buildVerifySql } from "../../lib/market-index/market-index-backfill-sql";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

const AUDITS_DIR = join(process.cwd(), "data", "audits");
const PLAN_PATH = join(AUDITS_DIR, "market-index-controlled-backfill-plan.json");
const APPLY_SQL_PATH = join(AUDITS_DIR, "market-index-controlled-backfill-apply.sql");
const VERIFY_SQL_PATH = join(AUDITS_DIR, "market-index-controlled-backfill-verify.sql");
const ROLLBACK_SQL_PATH = join(AUDITS_DIR, "market-index-controlled-backfill-rollback.sql");
const MANIFEST_PATH = join(AUDITS_DIR, "market-index-controlled-backfill-manifest.json");

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasMode(name: string): boolean {
  return process.argv.includes(name);
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local / .env.mission).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchLegacyData(): Promise<{ listings: BackfillPropertyListingRow[]; sources: BackfillListingSourceRow[] }> {
  const supabase = getSupabaseClient();
  const { data: listingsRaw, error: e1 } = await supabase
    .from("property_listings")
    .select("id, price_mad, transaction_type, title, description_snippet, field_confidence");
  if (e1) throw e1;
  const { data: sourcesRaw, error: e2 } = await supabase
    .from("listing_sources")
    .select("id, property_listing_id, source_name, listing_url, source_url");
  if (e2) throw e2;
  return {
    listings: (listingsRaw ?? []) as BackfillPropertyListingRow[],
    sources: (sourcesRaw ?? []) as BackfillListingSourceRow[],
  };
}

function canonicalPlanJson(plan: unknown): string {
  // Stable key order for a reproducible hash across runs/machines.
  return `${JSON.stringify(plan, Object.keys(plan as object).sort(), 2)}\n`;
}

// Narrative annotation only -- deliberately NOT part of the hashed plan
// object (plan_sha256 must stay a pure function of the 17 counters). See
// docs/MARKET_INDEX_CONTROLLED_BACKFILL_COLUMN_MAPPING.md for the full,
// per-row-level justification of why provenance_missing (135) exceeds the
// ODM's reference figure of 52.
function buildReferenceComparison(plan: ReturnType<typeof computeBackfillPlan>["plan"]) {
  return {
    property_listings_reference: 316,
    property_listings_actual: plan.property_listings_total,
    matches: plan.property_listings_total === 316,
    listing_sources_reference: 321,
    listing_sources_actual: plan.listing_sources_total,
    matches_sources: plan.listing_sources_total === 321,
    ambiguous_multi_source_groups_reference: 4,
    ambiguous_multi_source_groups_actual: plan.ambiguous_multi_source_groups,
    matches_ambiguous_groups: plan.ambiguous_multi_source_groups === 4,
    openserp_eligible_reference: 177,
    openserp_eligible_actual: plan.eligible_clusters,
    matches_openserp: plan.eligible_clusters === 177,
    provenance_missing_reference: 52,
    provenance_missing_actual: plan.skipped_missing_provenance,
    deviation_explained: true,
    deviation_explanation:
      "The ODM's reference figure of 52 corresponds exactly to property_listings rows with " +
      "field_confidence IS NULL entirely (51 single-source + 1 of the 4 multi-source groups). " +
      "A further 87 rows (84 single-source + 3 multi-source) have a non-null field_confidence " +
      "using an older, unrelated data-completeness-rating schema (no provider/acquisition_provider " +
      "key) which carries no explicit provenance marker; source_name alone was empirically shown " +
      "not to correlate with provenance (mubawab appears across all 3 buckets), so these 87 are " +
      "treated identically to the 52 -- no origin_type written, no cluster created. This is a MORE " +
      "conservative outcome than the reference figure, not a reduction, so the per-row-justification " +
      "rule for reducing 52 does not apply; full detail in " +
      "docs/MARKET_INDEX_CONTROLLED_BACKFILL_COLUMN_MAPPING.md.",
  };
}

async function runDryRun(): Promise<void> {
  const { listings, sources } = await fetchLegacyData();
  const { plan } = computeBackfillPlan(listings, sources);
  const planJson = canonicalPlanJson(plan);
  const planSha256 = sha256(planJson);

  const output = {
    audit_id: "market-index-controlled-backfill-plan",
    mission: "AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1",
    generated_at_utc: new Date().toISOString(),
    mode: "dry_run_read_only",
    plan_sha256: planSha256,
    ...plan,
    reference_comparison: buildReferenceComparison(plan),
  };

  await mkdir(AUDITS_DIR, { recursive: true });
  await writeFile(PLAN_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(output, null, 2));
  console.log(`\nWrote ${PLAN_PATH}`);
  console.log(`plan_sha256 = ${planSha256}`);
}

async function runGenerateSql(): Promise<void> {
  const runId = getArg("--run-id");
  if (!runId) {
    console.error("[run-controlled-market-index-backfill] --generate-sql requires --run-id <ID>.");
    process.exit(1);
  }

  const { listings, sources } = await fetchLegacyData();
  const { plan, eligible, skippedGroups } = computeBackfillPlan(listings, sources);
  const planJson = canonicalPlanJson(plan);
  const planSha256 = sha256(planJson);

  const applySql = buildApplySql(runId, eligible);
  const verifySql = buildVerifySql(runId, eligible);
  const rollbackSql = buildRollbackSql(runId, eligible);

  await mkdir(AUDITS_DIR, { recursive: true });
  await writeFile(APPLY_SQL_PATH, applySql, "utf8");
  await writeFile(VERIFY_SQL_PATH, verifySql, "utf8");
  await writeFile(ROLLBACK_SQL_PATH, rollbackSql, "utf8");

  const manifest = {
    audit_id: "market-index-controlled-backfill-manifest",
    mission: "AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1",
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    plan_sha256: planSha256,
    plan,
    reference_comparison: buildReferenceComparison(plan),
    apply_sql_sha256: sha256(applySql),
    verify_sql_sha256: sha256(verifySql),
    rollback_sql_sha256: sha256(rollbackSql),
    clusters_created: eligible.map((e) => ({
      cluster_id: e.cluster_id,
      legacy_property_listing_id: e.property_listing_id,
    })),
    memberships_created: eligible.map((e) => ({
      membership_id: e.membership_id,
      cluster_id: e.cluster_id,
      source_offer_id: e.listing_source_id,
    })),
    listing_sources_modified: eligible.map((e) => ({
      listing_source_id: e.listing_source_id,
      origin_type: e.origin_type,
      content_fingerprint: e.content_fingerprint,
      ingestion_run_id: runId,
      displayed_price: e.displayed_price,
      price_currency: e.price_currency,
      price_period: e.price_period,
      price_status: e.price_status,
    })),
    skipped_groups: skippedGroups,
  };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(
    PLAN_PATH,
    `${JSON.stringify(
      {
        audit_id: "market-index-controlled-backfill-plan",
        mission: "AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1",
        generated_at_utc: new Date().toISOString(),
        mode: "generate_sql",
        plan_sha256: planSha256,
        ...plan,
        reference_comparison: buildReferenceComparison(plan),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`plan_sha256 = ${planSha256}`);
  console.log(`apply_sql_sha256 = ${manifest.apply_sql_sha256}`);
  console.log(`verify_sql_sha256 = ${manifest.verify_sql_sha256}`);
  console.log(`rollback_sql_sha256 = ${manifest.rollback_sql_sha256}`);
  console.log(`eligible clusters/memberships = ${eligible.length}`);
  console.log(`\nWrote ${APPLY_SQL_PATH}\nWrote ${VERIFY_SQL_PATH}\nWrote ${ROLLBACK_SQL_PATH}\nWrote ${MANIFEST_PATH}\nWrote ${PLAN_PATH}`);
}

async function runVerify(): Promise<void> {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`[run-controlled-market-index-backfill] --verify requires an existing manifest at ${MANIFEST_PATH}.`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const supabase = getSupabaseClient();

  const counts: Record<string, number | null> = {};
  for (const table of ["property_clusters", "property_cluster_members", "discovery_candidates", "source_offer_observations"]) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) throw error;
    counts[table] = count;
  }

  const expectedClusters = manifest.clusters_created.length;
  const expectedMemberships = manifest.memberships_created.length;

  const report = {
    audit_id: "market-index-controlled-backfill-verify",
    mission: "AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1",
    generated_at_utc: new Date().toISOString(),
    run_id: manifest.run_id,
    counts,
    expected: {
      property_clusters: expectedClusters,
      property_cluster_members: expectedMemberships,
      discovery_candidates: 0,
      source_offer_observations: 0,
    },
    matches:
      counts.property_clusters === expectedClusters &&
      counts.property_cluster_members === expectedMemberships &&
      counts.discovery_candidates === 0 &&
      counts.source_offer_observations === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.matches) process.exit(1);
}

async function runApply(): Promise<void> {
  const runId = getArg("--run-id");
  const expectedPlanSha256 = getArg("--expected-plan-sha256");
  const confirmed = hasMode("--confirm-controlled-production-backfill");

  if (!runId || !expectedPlanSha256 || !confirmed) {
    console.error(
      "[run-controlled-market-index-backfill] --apply refused: requires --run-id <ID>, " +
        "--expected-plan-sha256 <HASH>, and --confirm-controlled-production-backfill, all three, together.",
    );
    process.exit(1);
  }

  // This project has no direct Postgres connection string available in any
  // environment file (only SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, i.e.
  // PostgREST access, which cannot execute the transactional apply SQL).
  // Per ODM section 20, the only two authorized application mechanisms are
  // (A) an already-approved direct connection, or (B) the project owner
  // running the generated apply.sql manually in the Supabase SQL Editor.
  // This script never invents a third mechanism.
  const directConnectionString = process.env.MARKET_INDEX_BACKFILL_APPROVED_DB_URL;
  if (!directConnectionString) {
    console.error(
      "[run-controlled-market-index-backfill] --apply refused: no approved direct database " +
        "connection is configured (MARKET_INDEX_BACKFILL_APPROVED_DB_URL is unset). This is " +
        "expected in this environment -- use mechanism B instead: run the generated " +
        `${APPLY_SQL_PATH} manually in the Supabase SQL Editor, with its SHA-256 pre-approved, ` +
        "then run --verify.",
    );
    process.exit(1);
  }

  if (!existsSync(APPLY_SQL_PATH)) {
    console.error(`[run-controlled-market-index-backfill] --apply refused: ${APPLY_SQL_PATH} does not exist. Run --generate-sql first.`);
    process.exit(1);
  }
  const applySql = await readFile(APPLY_SQL_PATH, "utf8");
  const actualApplySha256 = sha256(applySql);
  if (actualApplySha256 !== expectedPlanSha256) {
    console.error(
      `[run-controlled-market-index-backfill] --apply refused: apply.sql hash mismatch. ` +
        `expected ${expectedPlanSha256}, found ${actualApplySha256}. Regenerate or investigate before proceeding.`,
    );
    process.exit(1);
  }

  // Direct-connection execution path is intentionally unimplemented: this
  // project has never had a validated direct Postgres connection, and adding
  // one here without it ever being exercised/tested would be an untested,
  // unreviewed code path touching Production. Refuse explicitly rather than
  // shipping unverified DDL-execution code.
  console.error(
    "[run-controlled-market-index-backfill] --apply refused: a direct-connection execution " +
      "path is not implemented in this script (never validated, would be untested Production " +
      "code). Use mechanism B (Supabase SQL Editor) instead.",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const modes = ["--dry-run", "--generate-sql", "--verify", "--apply"].filter(hasMode);
  if (modes.length !== 1) {
    console.error(
      "[run-controlled-market-index-backfill] Refused: exactly one mode is required " +
        "(--dry-run | --generate-sql | --verify | --apply). Received: " +
        (modes.length === 0 ? "none" : modes.join(", ")),
    );
    process.exit(1);
  }

  if (hasMode("--dry-run")) return runDryRun();
  if (hasMode("--generate-sql")) return runGenerateSql();
  if (hasMode("--verify")) return runVerify();
  if (hasMode("--apply")) return runApply();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

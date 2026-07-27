import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  resolve(__dirname, "../../../supabase/migrations/20260727093000_odm_10a_coverage_audit.sql"),
  "utf8",
);
const runner = readFileSync(resolve(__dirname, "../../odm-10a-coverage-audit.ts"), "utf8");

test("coverage audit remains service-role-only and security invoker", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.odm_10a_coverage_audit\(integer,integer\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.odm_10a_coverage_audit\(integer,integer\) to service_role/i);
});

test("audit measures the complete search and structured pipeline", () => {
  for (const token of [
    "source_offer_seeds",
    "thin_index_documents",
    "eligible_public_representations",
    "property_listings",
    "listing_sources",
    "property_clusters",
    "cluster_members",
    "source_offer_observations",
    "lifecycle_signals",
  ]) assert.ok(migration.includes(token), `missing pipeline metric: ${token}`);
});

test("audit reports coverage gaps without claiming physical-property uniqueness", () => {
  for (const token of [
    "gap_to_target",
    "city_coverage_pct",
    "property_type_coverage_pct",
    "intent_coverage_pct",
    "price_coverage_pct",
    "surface_coverage_pct",
    "fresh_confirmed_pct",
  ]) assert.ok(migration.includes(token), `missing coverage metric: ${token}`);
  assert.match(migration, /representations, not certified physical properties/i);
});

test("connected runner is read-only and writes a reproducible JSON report", () => {
  assert.match(runner, /client\.rpc\("odm_10a_coverage_audit"/);
  assert.match(runner, /writeFile\(output/);
  assert.doesNotMatch(runner, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});

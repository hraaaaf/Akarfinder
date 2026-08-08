// P0.1 — Static contract proving the operational Source Registry is wired into
// the scheduled Common Crawl path and the database write boundary.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github/workflows/commoncrawl-mass-seed-harvest.yml"), "utf8");
const migration = readFileSync(join(root, "supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql"), "utf8");
const projector = readFileSync(join(root, "scripts/openserp/p0-1-project-commoncrawl-registry.ts"), "utf8");

test("scheduled Common Crawl workflow runs P0.1 policy projection before the first harvest", () => {
  const gateIndex = workflow.indexOf("p0-1-project-commoncrawl-registry.ts");
  const harvestIndex = workflow.indexOf("commoncrawl-registry-mass-harvest.ts");
  assert.ok(gateIndex >= 0, "P0.1 projection step must be present");
  assert.ok(harvestIndex >= 0, "Common Crawl harvester must still be present");
  assert.ok(gateIndex < harvestIndex, "policy projection must execute before any Common Crawl harvest");
  assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /SUPABASE_URL/);
});

test("runtime projector reads canonical source_policy_registry and can only downgrade structural entries", () => {
  assert.match(projector, /loadMassIndexSourcePolicies/);
  assert.match(projector, /MASS_INDEX_COMMONCRAWL_CHANNEL/);
  assert.match(projector, /status:\s*"unclassified"/);
  assert.doesNotMatch(projector, /status:\s*"approved_discovery"/);
  assert.doesNotMatch(projector, /\.from\(["']source_policy_registry["']\)\s*\.update/);
  assert.doesNotMatch(projector, /\.from\(["']source_policy_registry["']\)\s*\.upsert/);
});

test("database trigger blocks future Common Crawl seed inserts unless exact commoncrawl channel is policy-authorized", () => {
  assert.match(migration, /before insert or update of source_domain, seed_provider/i);
  assert.match(migration, /'commoncrawl'\s*=\s*any\(v_policy\.allowed_discovery_channels\)/i);
  assert.match(migration, /no_bypass_required is distinct from true/i);
  assert.match(migration, /nullif\(btrim\(v_policy\.policy_hash\), ''\) is null/i);
  assert.match(migration, /review_status not in \('current', 'due_soon'\)/i);
  assert.match(migration, /next_review_at <= now\(\)/i);
  assert.match(migration, /acquisition_mode = 'blocked'/i);
  assert.match(migration, /machine_gate.*like 'blocked%'/i);
  assert.match(migration, /ingestion_gate.*like 'blocked%'/i);
});

test("Common Crawl insert guard cannot manufacture freshness and does not block later freshness-only reconciliation", () => {
  assert.match(migration, /tg_op = 'INSERT'/i);
  assert.match(migration, /freshness_status <> 'seed_only'/i);
  assert.match(migration, /fresh_last_seen_at is not null/i);
  assert.match(migration, /cardinality\(new\.fresh_channels\) <> 0/i);
  assert.doesNotMatch(migration, /update of[^\n]*freshness_status/i);
  assert.doesNotMatch(migration, /update of[^\n]*fresh_last_seen_at/i);
  assert.doesNotMatch(migration, /update of[^\n]*fresh_channels/i);
});

test("migration is non-destructive to historical rows and publishes an explicit debt report", () => {
  assert.doesNotMatch(migration, /delete\s+from\s+public\.source_offer_seeds/i);
  assert.doesNotMatch(migration, /update\s+public\.source_offer_seeds/i);
  assert.match(migration, /historical_policy_mismatch/);
  assert.match(migration, /historical_seed_only_policy_mismatch/);
  assert.match(migration, /'historical_rows_mutated', false/);
});

test("P0.1 policy objects remain service-role only at the DB function boundary", () => {
  assert.match(migration, /revoke all on function public\.p0_1_enforce_mass_index_seed_policy\(\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.p0_1_enforce_mass_index_seed_policy\(\) to service_role/i);
  assert.match(migration, /security invoker/i);
});

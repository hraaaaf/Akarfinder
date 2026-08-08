// P0.1 — Static contract proving the operational Source Registry is wired into
// the Common Crawl request path, importer and database write boundary.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github/workflows/commoncrawl-mass-seed-harvest.yml"), "utf8");
const migration = readFileSync(join(root, "supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql"), "utf8");
const harvester = readFileSync(join(root, "scripts/openserp/commoncrawl-registry-mass-harvest.ts"), "utf8");
const importer = readFileSync(join(root, "scripts/openserp/ingest-commoncrawl-mass-seeds.ts"), "utf8");
const audit = readFileSync(join(root, "scripts/openserp/p0-1-audit-commoncrawl-registry.ts"), "utf8");

test("scheduled Common Crawl workflow provides canonical Registry credentials to both harvest phases", () => {
  assert.match(workflow, /Harvest policy-authorized Common Crawl canary domains first/);
  assert.match(workflow, /Harvest remaining policy-authorized Common Crawl domains/);
  assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /SUPABASE_URL/);
  assert.doesNotMatch(workflow, /p0-1-project-commoncrawl-registry/);
});

test("harvester enforces live Source Registry policy before any CDX loop", () => {
  const policyIndex = harvester.indexOf("loadMassIndexSourcePolicies(structuralDomains)");
  const domainLoopIndex = harvester.indexOf("for (const domain of domains)");
  assert.ok(policyIndex >= 0, "harvester must read canonical policy");
  assert.ok(domainLoopIndex > policyIndex, "policy read/evaluation must happen before domain CDX requests");
  assert.match(harvester, /MASS_INDEX_COMMONCRAWL_CHANNEL/);
  assert.match(harvester, /evaluateMassIndexDomains/);
  assert.match(harvester, /zero policy-authorized domains/);
});

test("importer re-reads live Source Registry so a stale artifact cannot authorize itself", () => {
  const policyIndex = importer.indexOf("loadMassIndexSourcePolicies(sourceDomains)");
  const insertIndex = importer.indexOf("await insertChunk");
  assert.ok(policyIndex >= 0, "importer must read canonical policy");
  assert.ok(insertIndex > policyIndex, "policy evaluation must precede any insert");
  assert.match(importer, /policyAuthorizedSeeds/);
  assert.match(importer, /policy_rejected_seed_rows/);
  assert.match(importer, /MASS_INDEX_COMMONCRAWL_CHANNEL/);
});

test("read-only certification audit never calls Common Crawl and never mutates the DB", () => {
  assert.match(audit, /loadMassIndexSourcePolicies/);
  assert.match(audit, /db_mutation:\s*false/);
  assert.match(audit, /commoncrawl_request:\s*false/);
  assert.doesNotMatch(audit, /fetch\(/);
  assert.doesNotMatch(audit, /\.update\(/);
  assert.doesNotMatch(audit, /\.upsert\(/);
  assert.doesNotMatch(audit, /\.insert\(/);
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

test("Common Crawl source/provider identity is immutable after seed creation", () => {
  assert.match(migration, /old\.seed_provider = 'commoncrawl_cdx' or new\.seed_provider = 'commoncrawl_cdx'/i);
  assert.match(migration, /new\.seed_provider is distinct from old\.seed_provider/i);
  assert.match(migration, /new\.source_domain is distinct from old\.source_domain/i);
  assert.match(migration, /source\/provider identity is immutable/i);
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

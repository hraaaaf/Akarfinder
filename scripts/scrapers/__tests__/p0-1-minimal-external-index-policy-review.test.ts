import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const MIGRATION = resolve("supabase/migrations/20260823213600_p0_1_commoncrawl_minimal_index_policy_review.sql");
const REGISTRY_WORKFLOW = resolve(".github/workflows/p0-1-mass-index-source-registry-gate.yml");
const COMMONCRAWL_WORKFLOW = resolve(".github/workflows/commoncrawl-mass-seed-harvest.yml");
const migration = readFileSync(MIGRATION, "utf8");
const registryWorkflow = readFileSync(REGISTRY_WORKFLOW, "utf8");
const commonCrawlWorkflow = readFileSync(COMMONCRAWL_WORKFLOW, "utf8");
const updateBlock = migration.match(/update public\.source_policy_registry\s+set([\s\S]*?)where source_domain = any\(v_targets\);/i)?.[1] ?? "";

const TARGETS = [
  "1immo.ma",
  "agenz.ma",
  "avito.ma",
  "barnes-marrakech.com",
  "kawtarimmobilier.com",
  "marrakechrealty.com",
  "masaken.ma",
  "mouldar.com",
  "mubawab.ma",
  "soukimmobilier.com",
] as const;

test("P0.1 policy review targets exactly the ten human-reviewed Common Crawl domains", () => {
  for (const domain of TARGETS) assert.match(migration, new RegExp(`'${domain.replaceAll(".", "\\.")}'`));
  assert.match(migration, /v_updated\s*<>\s*10/);
  assert.match(migration, /'commoncrawl'\s*=\s*any\(r\.allowed_discovery_channels\)/i);
  assert.match(updateBlock, /no_bypass_required\s*=\s*true/i);
});

test("P0.1 review is fixed-date and cannot become fresh again by replay", () => {
  assert.match(migration, /2026-08-23T21:36:00Z/);
  assert.match(migration, /2026-09-06T21:36:00Z/);
  assert.doesNotMatch(updateBlock, /next_review_at\s*=\s*now\(\)/i);
  assert.doesNotMatch(updateBlock, /reviewed_at\s*=\s*now\(\)/i);
});

test("P0.1 review never grants source content or detail acquisition", () => {
  assert.ok(updateBlock.length > 0);
  assert.doesNotMatch(updateBlock, /content_reuse_policy\s*=/i);
  assert.doesNotMatch(updateBlock, /detail_fetch_policy\s*=/i);
  assert.doesNotMatch(updateBlock, /authorization_status\s*=/i);
  assert.match(migration, /No source-network request, source-content reuse or rich-content ingestion is authorized/i);
  assert.match(migration, /content_reuse_policy\s*=\s*'authorized'/i);
  assert.match(migration, /detail_fetch_policy\s*=\s*'allowed_bounded'/i);
});

test("nine sources become canonical-link-only while BARNES remains public-hidden", () => {
  assert.match(updateBlock, /source_domain\s*=\s*'barnes-marrakech\.com'\s+then\s+'internal_signal_only'/i);
  assert.match(updateBlock, /source_domain\s*=\s*'barnes-marrakech\.com'\s+then\s+'hidden'/i);
  assert.match(migration, /display_policy\s*=\s*'canonical_link_only'/i);
  assert.match(migration, /expected exactly 9 public canonical-link-only sources/i);
  assert.match(migration, /authorization_status\s*=\s*'prohibited'[\s\S]*content_reuse_policy\s*=\s*'prohibited'[\s\S]*detail_fetch_policy\s*=\s*'permission_required'/i);
});

test("the exact-head registry and Common Crawl workflows cover this policy migration", () => {
  const migrationPath = "supabase/migrations/20260823213600_p0_1_commoncrawl_minimal_index_policy_review.sql";
  const testPath = "scripts/scrapers/__tests__/p0-1-minimal-external-index-policy-review.test.ts";
  for (const workflow of [registryWorkflow, commonCrawlWorkflow]) {
    assert.ok(workflow.includes(migrationPath));
    assert.ok(workflow.includes(testPath));
  }
});

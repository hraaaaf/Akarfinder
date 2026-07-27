import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260727103000_odm_10b_source_policy_registry.sql",
  "utf8",
);
const doctrine = readFileSync("docs/data/ODM-10B-SOURCE-REGISTRY.md", "utf8");

test("registry separates discovery, fetch, reuse and display policies", () => {
  for (const field of [
    "discovery_policy",
    "detail_fetch_policy",
    "content_reuse_policy",
    "display_policy",
    "robots_status",
    "terms_status",
  ]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`));
  }
});

test("registry enforces no-bypass and service-role-only access", () => {
  assert.match(migration, /no_bypass_required boolean not null default true check \(no_bypass_required\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.source_policy_registry from anon, authenticated, public/);
  assert.match(migration, /grant select, insert, update, delete on table public\.source_policy_registry to service_role/);
  assert.match(migration, /security invoker/);
});

test("restricted high-volume sources are not marked authorized", () => {
  const mubawab = migration.slice(
    migration.indexOf("('mubawab.ma'"),
    migration.indexOf("('avito.ma'"),
  );
  assert.match(mubawab, /'permission_required', 'prohibited', 'internal_signal_only'/);

  const avito = migration.slice(
    migration.indexOf("('avito.ma'"),
    migration.indexOf("('daragadir.com'"),
  );
  assert.match(avito, /'legal_review_required', 'unknown', 'internal_signal_only'/);
});

test("registered priorities are actions, not automatic scraping permissions", () => {
  assert.match(doctrine, /action ranking, not a scraping authorization ranking/i);
  assert.match(doctrine, /partnership\/feed outreach/i);
  assert.match(doctrine, /written permission/i);
});

test("source evidence and review cadence are mandatory", () => {
  assert.match(migration, /evidence_urls text\[\] not null/);
  assert.match(migration, /evidence_summary text not null/);
  assert.match(migration, /reviewed_at timestamptz not null/);
  assert.match(migration, /next_review_at timestamptz not null/);
});

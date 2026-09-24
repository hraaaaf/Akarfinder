import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260924110000_akarfinder_ha_replication_canary_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("HA canary is isolated from business/auth/storage tables", () => {
  assert.match(
    migration,
    /create table if not exists public\.akarfinder_ha_replication_canary/,
  );
  assert.doesNotMatch(migration, /references\s+(public\.|auth\.|storage\.)/i);
  assert.doesNotMatch(migration, /seller_|property_listings|buyer_leads/i);
});

test("HA canary uses UUID primary key and no sequence-backed identifier", () => {
  assert.match(migration, /id uuid primary key default gen_random_uuid\(\)/);
  assert.doesNotMatch(migration, /bigserial|serial\b|nextval\(/i);
});

test("HA canary is ready for UPDATE and DELETE logical replication", () => {
  assert.match(migration, /replica identity default/);
  assert.match(migration, /primary key/);
  assert.match(migration, /version integer not null default 1/);
});

test("HA canary is not exposed to application roles", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.akarfinder_ha_replication_canary from public/);
  assert.match(migration, /rolname = 'anon'/);
  assert.match(migration, /rolname = 'authenticated'/);
  assert.match(migration, /rolname = 'service_role'/);
  assert.doesNotMatch(migration, /create policy/i);
});

test("HA canary has no trigger dependency", () => {
  assert.doesNotMatch(migration, /create trigger/i);
  assert.match(migration, /updated_at timestamptz not null default now\(\)/);
});

test("HA canary migration documents production gate", () => {
  assert.match(migration, /Do not apply to production/);
  assert.match(migration, /explicit production DB change approval/);
});

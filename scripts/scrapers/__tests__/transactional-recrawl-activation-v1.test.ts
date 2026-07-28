import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = "supabase/migrations/20260727003000_create_transactional_recrawl_activation_v1.sql";

async function sql(): Promise<string> {
  return readFile(migrationPath, "utf8");
}

test("transactional recrawl RPC locks and validates the active lease", async () => {
  const source = await sql();
  assert.match(source, /for update;/i);
  assert.match(source, /recrawl claim is missing or expired/i);
  assert.match(source, /source_key mismatch/i);
});

test("one atomic RPC persists observation, ledger, lifecycle, attempt and reschedule", async () => {
  const source = await sql();
  assert.match(source, /insert into public\.source_offer_observations/i);
  assert.match(source, /persist_observation_ledger_event/i);
  assert.match(source, /persist_source_offer_lifecycle_signal/i);
  assert.match(source, /record_recrawl_attempt/i);
  assert.match(source, /next_recrawl_at/i);
});

test("idempotency uses the canonical observation conflict key and attempt key", async () => {
  const source = await sql();
  assert.match(source, /on conflict do nothing/i);
  assert.match(source, /observed_at_bucket = date_trunc\('hour', p_observed_at\)/i);
  assert.match(source, /p_attempt_key/i);
});

test("change derivation covers price, content, surface, withdrawal and reactivation", async () => {
  const source = await sql();
  for (const event of [
    "price_decreased",
    "price_increased",
    "price_disclosed",
    "price_removed",
    "content_changed",
    "surface_changed",
    "withdrawn",
    "reactivated",
    "availability_changed",
  ]) {
    assert.ok(source.includes(`'${event}'`), `missing ${event}`);
  }
});

test("publication remains impossible and RPC is service-role only", async () => {
  const source = await sql();
  assert.match(source, /'publication_eligible', false/i);
  assert.match(source, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(source, /grant execute on function[\s\S]*to service_role/i);
});

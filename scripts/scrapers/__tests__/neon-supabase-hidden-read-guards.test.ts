import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Neon mode explicitly bypasses the Supabase Search Gateway cache", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/search-gateway-cache/supabase-cache-store.ts"),
    "utf8",
  );
  assert.ok(source.includes('getDbProvider() === "neon"'));
  assert.ok(source.includes('NoopSearchGatewayCacheStore("neon_cache_not_migrated")'));
});

test("Neon mode explicitly bypasses the legacy Supabase Public Index POC", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/public-property-index/supabase-index-store.ts"),
    "utf8",
  );
  assert.ok(source.includes('getDbProvider(env) === "neon"'));
  assert.ok(source.includes('NoopPublicPropertyIndexStore("neon_public_index_not_migrated")'));
});

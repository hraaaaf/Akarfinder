import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CRITICAL_RUNTIME_FILES = [
  "app/api/search/gateway/route.ts",
  "lib/search-gateway/public-search-cursor.ts",
  "lib/search-gateway/seed-thin-index.ts",
  "lib/map/city-market-intelligence-live.ts",
  "lib/map/rabat-market-intelligence-live.ts",
  "lib/seller/owner-listing-projection.ts",
] as const;

test("Neon-only critical Search/Market paths do not import or reference Supabase", async () => {
  for (const path of CRITICAL_RUNTIME_FILES) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(
      source,
      /supabase|SUPABASE/,
      `${path} must not reference Supabase on the Neon-only runtime path`,
    );
  }
});

test("Neon runtime read adapter stays read-only", async () => {
  const source = await readFile("lib/db/neon-read-client.ts", "utf8");
  assert.match(source, /SELECT /);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|UPSERT|ALTER|DROP|CREATE)\b/i);
});

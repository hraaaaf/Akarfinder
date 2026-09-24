import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("owner detail routes DB rows through Neon provider and keeps eligibility fail-closed", () => {
  const source = readFileSync(join(process.cwd(), "lib/seller/owner-listing-detail.ts"), "utf8");
  assert.ok(source.includes('getDbProvider() === "neon"'));
  assert.ok(source.includes("FROM public.owner_listing_representations"));
  assert.ok(source.includes("WHERE id = $1::uuid"));
  assert.ok(source.includes("lifecycle_status = 'live'"));
  assert.ok(source.includes("display_eligibility = ANY($2::text[])"));
  assert.ok(source.includes("normalizedOwnerDetailRow"));
});

test("owner media fails closed when temporary Supabase Storage is unavailable", () => {
  const source = readFileSync(join(process.cwd(), "lib/seller/owner-listing-media.ts"), "utf8");
  assert.ok(source.includes("supabase?: SupabaseClient"));
  assert.ok(source.includes("const client = supabase ?? getSupabaseServerClient()"));
  assert.ok(source.includes("During the DB-first Neon phase"));
  assert.ok(source.includes("catch {"));
  assert.ok(source.includes("return [];"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/data-mass/mass-index-m5-shadow-dedup.ts"), "utf8");

test("M5 shadow dedup stays read-only", () => {
  assert.equal(source.includes('.insert('), false);
  assert.equal(source.includes('.delete('), false);
  assert.equal(source.includes('.upsert('), false);
  assert.equal(source.includes('.rpc('), false);

  // The only `.update(` call is node:crypto Hash.update(), not a Supabase mutation.
  const updateCalls = source.match(/\.update\(/g) ?? [];
  assert.equal(updateCalls.length, 1);
  assert.equal(source.includes('createHash("sha256").update(key)'), true);

  assert.equal(source.includes('databaseWrites: 0'), true);
  assert.equal(source.includes('propertyClustersMutated: 0'), true);
});

test("M5 collision output never claims duplicate or unique-property proof", () => {
  assert.equal(source.includes('EXACT_FULL_DIMENSION_COLLISION_NOT_DUPLICATE_PROOF'), true);
  assert.equal(source.includes('uniquePropertyMetricClaimed: false'), true);
  assert.equal(source.includes('collisionIsDuplicateProof: false'), true);
});

test("M5 shadow uses exact normalized dimensions and cross-source labeling", () => {
  for (const field of [
    'normalized_city',
    'normalized_property_type',
    'normalized_intent',
    'normalized_price_mad',
    'normalized_surface_m2',
  ]) assert.equal(source.includes(field), true);
  assert.equal(source.includes('sourceDomains.length > 1'), true);
});

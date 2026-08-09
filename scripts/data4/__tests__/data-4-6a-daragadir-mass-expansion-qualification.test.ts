import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-6a-daragadir-mass-expansion-qualification.ts", "utf8");

test("DATA-4.6A remains read-only and sitemap-only", () => {
  for (const token of [
    'mode: "READ_ONLY_QUALIFICATION"',
    'databaseWrites: 0',
    'freshnessWrites: 0',
    'registryMutations: 0',
    'policyChanges: 0',
    'productionActivation: false',
    'detailPageFetches: 0',
    'writeAuthorized: false',
    'MAX_SOURCE_REQUESTS = 40',
    'https://daragadir.com/robots.txt',
  ]) assert.ok(script.includes(token), `missing ${token}`);

  assert.equal(/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/.test(script), false);
  assert.equal(script.includes("/annonces/annonces-immobilieres/"), false, "audit must not hard-fetch detail paths");
});

test("DATA-4.6A conservative candidate requires core normalized facts and quality", () => {
  for (const token of [
    'row.normalization_status !== "normalized"',
    'row.freshness_status !== "seed_only"',
    '!row.city || !row.property_type || !row.intent || !row.title',
    'row.price_mad === null || row.surface_m2 === null',
    '["A", "B"].includes(display.quality_tier ?? "")',
    'publicSet.has(row.canonical_url)',
  ]) assert.ok(script.includes(token), `missing conservative gate ${token}`);
});

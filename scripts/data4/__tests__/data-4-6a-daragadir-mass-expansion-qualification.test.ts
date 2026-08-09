import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-6a-daragadir-mass-expansion-qualification.ts", "utf8");

test("DATA-4.6A remains read-only and robots/policy-only", () => {
  for (const token of [
    'mode: "READ_ONLY_QUALIFICATION"',
    'databaseWrites: 0',
    'freshnessWrites: 0',
    'registryMutations: 0',
    'policyChanges: 0',
    'productionActivation: false',
    'detailPageFetches: 0',
    'writeAuthorized: false',
    'MAX_SOURCE_REQUESTS = 2',
    'https://daragadir.com/robots.txt',
  ]) assert.ok(script.includes(token), `missing ${token}`);

  assert.equal(/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/.test(script), false);
  assert.equal(script.includes("/annonces/annonces-immobilieres/"), false, "audit must not fetch detail paths");
});

test("DATA-4.6A fails closed on current robots sitemap drift", () => {
  for (const token of [
    'extractRobotsSitemaps(robotsText)',
    'SOURCE_SITEMAP_DECLARATION_DRIFT',
    'sourceDeclarationMatchesRegistry',
    'suggestedNextCheckpoint: 0',
    'ROTATE_TO_NEXT_PUBLIC_SITEMAP_RESERVOIR',
  ]) assert.ok(script.includes(token), `missing drift guard ${token}`);
});

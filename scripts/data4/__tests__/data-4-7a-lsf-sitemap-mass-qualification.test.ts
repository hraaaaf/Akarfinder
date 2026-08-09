import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-7a-lsf-sitemap-mass-qualification.ts", "utf8");

test("DATA-4.7A is read-only and sitemap-only", () => {
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
    'limmobiliersansfrontieres.com',
  ]) assert.ok(script.includes(token), `missing ${token}`);
  assert.equal(/method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/.test(script), false);
});

test("DATA-4.7A rotates on source drift and gates writes", () => {
  for (const token of [
    'SOURCE_SITEMAP_DECLARATION_DRIFT',
    'QUALIFIED_FOR_CONTROLLED_EXPANSION_DESIGN',
    'ROTATE_TO_NEXT_PUBLIC_SITEMAP_RESERVOIR',
    'DATA-4.7B_LSF_CONTROLLED_EXPANSION_WRITE',
    'conservativeCandidatesInPublicSearch',
  ]) assert.ok(script.includes(token), `missing ${token}`);
});

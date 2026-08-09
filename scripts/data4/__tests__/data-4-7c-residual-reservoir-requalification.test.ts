import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-7c-residual-reservoir-requalification.ts", "utf8");

test("DATA-4.7C rotates across all display-admissible public-sitemap reservoirs read-only", () => {
  for (const token of [
    '"daragadir.com"',
    '"promoimmomarrakech.com"',
    '"aykana.ma"',
    '"limmobiliersansfrontieres.com"',
    'READ_ONLY_SOURCE_ROTATION',
    'DATA-4.7D_BOUNDED_WRITE',
    'databaseWrites: 0',
    'registryMutations: 0',
    'policyChanges: 0',
    'productionActivation: false',
  ]) assert.ok(script.includes(token), `missing ${token}`);
  assert.equal(script.includes('"atlasimmobilier.com"'), false);
  assert.equal(script.includes('method: "PATCH"'), false);
  assert.equal(script.includes('method: "POST"'), false);
  assert.equal(script.includes('method: "DELETE"'), false);
});

test("DATA-4.7C isolates blocked sources instead of making one source the critical path", () => {
  for (const token of [
    'BLOCKED_POLICY',
    'BLOCKED_SOURCE_EVIDENCE',
    'status: "QUALIFIED"',
    'results.filter((result) => result.status === "QUALIFIED")',
    'found no live qualified public-sitemap reservoir',
    'blockedCount',
    'totalLiveCandidateCapacity',
  ]) assert.ok(script.includes(token), `missing rotation boundary ${token}`);
});

test("DATA-4.7C uses current Registry + same-origin sitemap evidence only", () => {
  for (const token of [
    'public_sitemap_canonical_link',
    'public_sitemap_only',
    'canonical_link_only',
    'external_tail_link_only',
    'nextReview.getTime() > now.getTime()',
    'https://${domain}/robots.txt',
    'MAX_REQUESTS_PER_SOURCE = 40',
    'detailPageRequests: 0',
  ]) assert.ok(script.includes(token), `missing ${token}`);
});

test("DATA-4.7C preserves long-tail and collision fail-closed semantics", () => {
  for (const token of [
    '["eligible_primary", "eligible_secondary"].includes',
    'decodeURIComponent(pathname).normalize("NFC")',
    'dbIdentity.get(identity!)?.length === 1',
    'sitemapIdentity.get(identity!)?.length === 1',
    'preSitemapUpperBound',
    'liveCandidateRows',
    'excludedBySitemapOrIdentity',
  ]) assert.ok(script.includes(token), `missing ${token}`);
  assert.equal(script.includes('row.price_mad'), false);
  assert.equal(script.includes('["A", "B"].includes'), false);
});

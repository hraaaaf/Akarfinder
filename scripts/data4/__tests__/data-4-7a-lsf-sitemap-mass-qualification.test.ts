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

test("DATA-4.7A qualifies the Search long-tail without requiring premium completeness", () => {
  for (const token of [
    'function massTailCandidate',
    '["eligible_primary", "eligible_secondary"].includes(display.display_eligibility ?? "")',
    'massTailCandidatesInPublicSearch',
    'massTailTierB',
    'massTailTierC',
    'massTailWithPrice',
    'massTailWithSurface',
    'massTailWithTitle',
    'INSUFFICIENT_MASS_TAIL_LIVE_RESERVOIR',
    'DATA-4.7B_LSF_CONTROLLED_EXPANSION_WRITE',
  ]) assert.ok(script.includes(token), `missing mass-tail contract ${token}`);

  assert.equal(script.includes('row.price_mad !== null && row.surface_m2 !== null'), false);
  assert.equal(script.includes('["A", "B"].includes(display.quality_tier ?? "")'), false);
});

test("DATA-4.7A compares URL identity conservatively and excludes ambiguous collisions", () => {
  for (const token of [
    'function conservativeUrlIdentity',
    'decodeURIComponent(pathname).normalize("NFC")',
    'replace(/^www\\./, "")',
    'pathname.replace(/\\/+$/, "")',
    'dbIdentityCollisions',
    'sitemapIdentityCollisions',
    'safeIdentityKeys',
    'rows.length === 1 && sitemapByIdentity.get(key)?.length === 1',
    'exactUrlMatches',
    'safeIdentityMatches',
  ]) assert.ok(script.includes(token), `missing conservative identity contract ${token}`);
});

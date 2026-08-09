import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-8a-net-new-sitemap-qualification.ts", "utf8");

test("DATA-4.8A is strictly read-only and separates structure from permission", () => {
  for (const token of [
    'READ_ONLY_STRUCTURAL_DETAIL_QUALIFICATION',
    'STRUCTURE_REGISTRY_PATH = "data/openserp/source-domain-registry.json"',
    'permissionAuthority: false',
    'authorizationAuthority: false',
    'databaseWrites: 0',
    'registryMutations: 0',
    'policyChanges: 0',
    'productionActivation: false',
  ]) assert.ok(script.includes(token), `missing ${token}`);
  for (const forbidden of ['method: "PATCH"', 'method: "POST"', 'method: "DELETE"']) {
    assert.equal(script.includes(forbidden), false, `forbidden write path ${forbidden}`);
  }
});

test("DATA-4.8A requires live public-sitemap Registry authorization", () => {
  for (const token of [
    'public_sitemap_canonical_link',
    'public_sitemap_only',
    'canonical_link_only',
    'external_tail_link_only',
    'nextReview.getTime() > now.getTime()',
    'https://${domain}/robots.txt',
    'sourceSiteDetailRequests: 0',
  ]) assert.ok(script.includes(token), `missing ${token}`);
});

test("DATA-4.8A computes true seed-absent identities before structural classification", () => {
  for (const token of [
    'const seedIdentities = new Set<string>()',
    '!seedIdentities.has(identity)',
    'DETAIL_PATTERN_MATCH',
    'REJECT_BLOCKED_PATTERN',
    'REJECT_NO_DETAIL_PATTERN',
    'candidate-manifest.json',
    'reject-manifest.json',
    'candidateDigestSha256',
  ]) assert.ok(script.includes(token), `missing ${token}`);
});

test("DATA-4.8A rotates over the same four admissible sitemap sources and excludes Atlas", () => {
  for (const domain of ['daragadir.com','promoimmomarrakech.com','aykana.ma','limmobiliersansfrontieres.com']) {
    assert.ok(script.includes(`"${domain}"`), `missing source ${domain}`);
  }
  assert.equal(script.includes('"atlasimmobilier.com"'), false);
});

test("DATA-4.8A never claims structural matches are fetched or content-certified listings", () => {
  for (const token of [
    'Structural detail-pattern match is not detail-content reuse',
    'no-detail-fetch',
    'detailPageRequests: 0',
    'DATA-4.8B_BOUNDED_NET_NEW_SEED_INGESTION',
  ]) assert.ok(script.includes(token), `missing truth boundary ${token}`);
});

test("DATA-4.8A rejects namespace roots even when a broad historical pattern matches", () => {
  for (const token of [
    'function isPlainNamespaceRoot',
    'REJECT_NAMESPACE_ROOT',
    'namespaceRoot: rejects.filter',
  ]) assert.ok(script.includes(token), `missing namespace-root guard ${token}`);
});

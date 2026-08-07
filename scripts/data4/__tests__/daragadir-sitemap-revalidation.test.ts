import assert from "node:assert/strict";
import test from "node:test";
import {
  compareExistingToSitemap,
  extractRobotsSitemaps,
  parseSitemapXml,
  policyAllowsSitemapRevalidation,
  sameDarAgadirOrigin,
  type DarAgadirRevalidationPolicy,
} from "../daragadir-sitemap-revalidation";

function policy(overrides: Partial<DarAgadirRevalidationPolicy> = {}): DarAgadirRevalidationPolicy {
  return {
    sourceDomain: "daragadir.com",
    acquisitionMode: "public_sitemap_canonical_link",
    discoveryPolicy: "public_sitemap_only",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    allowedDiscoveryChannels: ["public_sitemap"],
    robotsStatus: "sitemap_declared",
    evidenceUrls: ["https://daragadir.com/robots.txt"],
    maxRevalidationIntervalDays: 14,
    reviewStatus: "due_soon",
    ...overrides,
  };
}

test("exact Registry boundary allows bounded sitemap revalidation", () => {
  assert.equal(policyAllowsSitemapRevalidation(policy()), true);
  assert.equal(policyAllowsSitemapRevalidation(policy({ displayGate: "hidden" })), false);
  assert.equal(policyAllowsSitemapRevalidation(policy({ reviewStatus: "overdue" })), false);
});

test("robots parser only keeps same-origin https sitemap declarations", () => {
  const sitemaps = extractRobotsSitemaps([
    "Sitemap: https://daragadir.com/sitemap_index.xml",
    "Sitemap: https://evil.example/sitemap.xml",
    "Sitemap: http://daragadir.com/old.xml",
  ].join("\n"));
  assert.deepEqual(sitemaps, ["https://daragadir.com/sitemap_index.xml"]);
});

test("sitemap parser detects index and de-duplicates same-origin locs", () => {
  const parsed = parseSitemapXml(`<?xml version="1.0"?><sitemapindex><sitemap><loc>https://daragadir.com/a.xml</loc></sitemap><sitemap><loc>https://daragadir.com/a.xml</loc></sitemap><sitemap><loc>https://other.test/b.xml</loc></sitemap></sitemapindex>`);
  assert.equal(parsed.kind, "index");
  assert.deepEqual(parsed.locs, ["https://daragadir.com/a.xml"]);
});

test("comparison reports sitemap presence without mutating freshness", () => {
  const result = compareExistingToSitemap([
    { canonicalUrl: "https://daragadir.com/a", freshnessStatus: "seed_only", normalizationStatus: "normalized" },
    { canonicalUrl: "https://daragadir.com/b", freshnessStatus: "fresh_confirmed", normalizationStatus: "normalized" },
    { canonicalUrl: "https://daragadir.com/c", freshnessStatus: "seed_only", normalizationStatus: "normalized" },
  ], new Set(["https://daragadir.com/a", "https://daragadir.com/b"]));
  assert.equal(result.existingPresent, 2);
  assert.equal(result.seedOnlyPresent, 1);
  assert.equal(result.freshPresent, 1);
  assert.equal(result.existingMissing, 1);
});

test("origin gate rejects non-https and unrelated hosts", () => {
  assert.equal(sameDarAgadirOrigin("https://daragadir.com/x"), true);
  assert.equal(sameDarAgadirOrigin("https://www.daragadir.com/x"), true);
  assert.equal(sameDarAgadirOrigin("http://daragadir.com/x"), false);
  assert.equal(sameDarAgadirOrigin("https://example.com/x"), false);
});

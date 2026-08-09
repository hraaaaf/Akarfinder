import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  DATA_4_9A_CANDIDATES,
  computeMassScore,
  conservativeUrlIdentity,
  decodeSitemapPayload,
  extractDeclaredSitemaps,
  massRecommendation,
  parseSitemapXml,
  registryIsCurrentOnboardingCandidate,
  sameOriginHttps,
  summarizePathSignals,
  type RegistryRow,
} from "../mass-source-onboarding-qualification";

test("candidate cohort excludes retired Promo Immo and contains exactly ten sitemap-declared onboarding candidates", () => {
  assert.equal(DATA_4_9A_CANDIDATES.length, 10);
  assert.equal(DATA_4_9A_CANDIDATES.includes("promoimmomarrakech.com" as never), false);
  assert.equal(new Set(DATA_4_9A_CANDIDATES).size, DATA_4_9A_CANDIDATES.length);
});

test("same-origin gate accepts only HTTPS domain/www and rejects lookalikes", () => {
  assert.equal(sameOriginHttps("valfoncier.ma", "https://valfoncier.ma/sitemap.xml"), true);
  assert.equal(sameOriginHttps("valfoncier.ma", "https://www.valfoncier.ma/sitemap.xml"), true);
  assert.equal(sameOriginHttps("valfoncier.ma", "http://valfoncier.ma/sitemap.xml"), false);
  assert.equal(sameOriginHttps("valfoncier.ma", "https://evil.example/?u=valfoncier.ma"), false);
  assert.equal(sameOriginHttps("valfoncier.ma", "https://valfoncier.ma.evil.example/sitemap.xml"), false);
});

test("robots extraction keeps only declared same-origin HTTPS sitemap roots", () => {
  const robots = [
    "User-agent: *",
    "Sitemap: https://valfoncier.ma/sitemap_index.xml",
    "sitemap: https://www.valfoncier.ma/sitemap-2.xml",
    "Sitemap: http://valfoncier.ma/insecure.xml",
    "Sitemap: https://other.example/sitemap.xml",
    "Sitemap: https://valfoncier.ma/sitemap_index.xml",
  ].join("\n");
  assert.deepEqual(extractDeclaredSitemaps("valfoncier.ma", robots), [
    "https://valfoncier.ma/sitemap_index.xml",
    "https://www.valfoncier.ma/sitemap-2.xml",
  ]);
});

test("sitemap parser distinguishes index/urlset and filters off-origin locs", () => {
  const index = parseSitemapXml("nouraimmobilier.ma", `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://nouraimmobilier.ma/a.xml</loc></sitemap><sitemap><loc>https://evil.example/b.xml</loc></sitemap></sitemapindex>`);
  assert.equal(index.kind, "index");
  assert.deepEqual(index.locs, ["https://nouraimmobilier.ma/a.xml"]);

  const set = parseSitemapXml("nouraimmobilier.ma", `<?xml version="1.0"?><urlset><url><loc>https://www.nouraimmobilier.ma/property/a&amp;b=1</loc></url></urlset>`);
  assert.equal(set.kind, "urlset");
  assert.deepEqual(set.locs, ["https://www.nouraimmobilier.ma/property/a&b=1"]);
});

test("sitemap payload decoder handles raw XML and gzip by magic bytes without double-decompression assumptions", () => {
  const xml = "<?xml version=\"1.0\"?><urlset></urlset>";
  assert.equal(decodeSitemapPayload(Buffer.from(xml)), xml);
  assert.equal(decodeSitemapPayload(gzipSync(Buffer.from(xml))), xml);
});

test("conservative identity collapses www/trailing slash/query order but preserves meaningful query", () => {
  const a = conservativeUrlIdentity("immo-maroc.com", "https://www.immo-maroc.com/property/a/?b=2&a=1#x");
  const b = conservativeUrlIdentity("immo-maroc.com", "https://immo-maroc.com/property/a?a=1&b=2");
  const c = conservativeUrlIdentity("immo-maroc.com", "https://immo-maroc.com/property/a?a=9&b=2");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(conservativeUrlIdentity("immo-maroc.com", "https://other.example/property/a"), null);
});

test("registry onboarding gate is strict and never equates sitemap evidence with display authorization", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const row: RegistryRow = {
    source_domain: "valfoncier.ma",
    authorization_status: "unverified",
    acquisition_mode: "public_index_internal_only",
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    display_gate: "hidden",
    ingestion_gate: "internal_signal_only",
    robots_status: "sitemap_declared",
    terms_status: "unverified",
    review_status: "current",
    next_review_at: future,
    current_representation_count: 0,
  };
  assert.equal(registryIsCurrentOnboardingCandidate("valfoncier.ma", row, new Date()), true);
  assert.equal(registryIsCurrentOnboardingCandidate("valfoncier.ma", { ...row, display_gate: "external_tail_link_only" }, new Date()), false);
  assert.equal(registryIsCurrentOnboardingCandidate("valfoncier.ma", { ...row, authorization_status: "prohibited" }, new Date()), false);
  assert.equal(registryIsCurrentOnboardingCandidate("valfoncier.ma", { ...row, robots_status: "allow_with_restrictions" }, new Date()), false);
  assert.equal(registryIsCurrentOnboardingCandidate("valfoncier.ma", { ...row, current_representation_count: 1 }, new Date()), false);
});

test("path signals are descriptive only and expose dominant namespaces", () => {
  const signals = summarizePathSignals([
    "https://valfoncier.ma/property/a-123",
    "https://valfoncier.ma/property/b-456.html",
    "https://valfoncier.ma/blog/news",
  ]);
  assert.deepEqual(signals.topPrefixes[0], { prefix: "/property/", count: 2 });
  assert.equal(signals.idLikePathRows, 2);
  assert.equal(signals.htmlLikeRows, 1);
  assert.equal(signals.propertyWordRows, 2);
});

test("mass scoring rewards observed capacity while treating truncated trees as lower bounds", () => {
  const high = computeMassScore({ observedNetNewIdentities: 800, sourceRequests: 6, collisionRows: 0, uniqueIdentityRows: 800, capacityKind: "complete" });
  const truncated = computeMassScore({ observedNetNewIdentities: 800, sourceRequests: 40, collisionRows: 0, uniqueIdentityRows: 800, capacityKind: "lower_bound_request_cap" });
  assert.equal(high, 85);
  assert.equal(massRecommendation(high, 800), "HIGH_MASS_ONBOARDING_CANDIDATE");
  assert.ok(truncated < high);
  assert.equal(massRecommendation(60, 150), "MEDIUM_MASS_ONBOARDING_CANDIDATE");
  assert.equal(massRecommendation(90, 0), "NO_CURRENT_SITEMAP_CAPACITY");
});

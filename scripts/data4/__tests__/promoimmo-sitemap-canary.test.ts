import assert from "node:assert/strict";
import test from "node:test";
import {
  PROMOIMMO_CHANNEL,
  PROMOIMMO_RUN_ID,
  buildPromoImmoCanaryPlan,
  extractPromoImmoRobotsSitemaps,
  parsePromoImmoSitemapXml,
  registryAllowsPromoImmoCanary,
  selectPromoImmoCanary,
  type PromoImmoCandidate,
} from "../promoimmo-sitemap-canary";

test("accepts only the certified Promo Immo Registry shape", () => {
  assert.equal(registryAllowsPromoImmoCanary({
    sourceDomain: "promoimmomarrakech.com",
    acquisitionMode: "public_sitemap_canonical_link",
    discoveryPolicy: "public_sitemap_only",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    machineGate: "canonical_link_only",
    allowedDiscoveryChannels: ["public_sitemap"],
    robotsStatus: "sitemap_declared",
    maxRevalidationIntervalDays: 14,
    reviewStatus: "due_soon",
  }), true);
});

test("extracts only same-origin sitemap declarations", () => {
  const sitemaps = extractPromoImmoRobotsSitemaps([
    "Sitemap: https://promoimmomarrakech.com/sitemap.xml",
    "Sitemap: https://www.promoimmomarrakech.com/post-sitemap.xml",
    "Sitemap: https://example.com/evil.xml",
  ].join("\n"));
  assert.deepEqual(sitemaps, [
    "https://promoimmomarrakech.com/sitemap.xml",
    "https://www.promoimmomarrakech.com/post-sitemap.xml",
  ]);
});

test("parses same-origin sitemap URLs only", () => {
  const parsed = parsePromoImmoSitemapXml(`<?xml version="1.0"?><urlset><url><loc>https://promoimmomarrakech.com/produit/a.html</loc></url><url><loc>https://other.example/a</loc></url></urlset>`);
  assert.equal(parsed.kind, "urlset");
  assert.deepEqual(parsed.locs, ["https://promoimmomarrakech.com/produit/a.html"]);
});

const baseCandidate: PromoImmoCandidate = {
  canonicalUrl: "https://promoimmomarrakech.com/produit/a/location-appartement-marrakech-gueliz.html",
  freshnessStatus: "seed_only",
  normalizationStatus: "normalized",
  city: "Marrakech",
  propertyType: "apartment",
  intent: "rent",
  qualityTier: "B",
  qualityScore: 60,
  displayEligibility: "eligible_secondary",
  publicSearchPresent: true,
  technicalDisplayPresent: true,
  exactCrossSourceCollision: false,
};

test("selects only conservative A/B canary candidates", () => {
  const selected = selectPromoImmoCanary([
    baseCandidate,
    { ...baseCandidate, canonicalUrl: "https://promoimmomarrakech.com/produit/b.html", qualityTier: "C", qualityScore: 48 },
    { ...baseCandidate, canonicalUrl: "https://promoimmomarrakech.com/produit/c.html", city: "Casablanca" },
    { ...baseCandidate, canonicalUrl: "https://promoimmomarrakech.com/produit/d.html", exactCrossSourceCollision: true },
  ]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.canonicalUrl, baseCandidate.canonicalUrl);
});

test("builds exact typed proposal and rollback snapshot", () => {
  const plan = buildPromoImmoCanaryPlan({
    canonicalUrl: baseCandidate.canonicalUrl,
    freshnessStatus: "seed_only",
    freshLastSeenAt: null,
    freshChannels: [],
    metadata: { source: "seed" },
    updatedAt: "2026-08-08T08:00:00.000Z",
  }, {
    canonicalUrl: baseCandidate.canonicalUrl,
    sitemapUrl: "https://promoimmomarrakech.com/post-sitemap.xml",
    observedAt: "2026-08-08T09:00:00.000Z",
  });
  assert.equal(plan.proposed.freshnessStatus, "fresh_confirmed");
  assert.ok(plan.proposed.freshChannels.includes(PROMOIMMO_CHANNEL));
  assert.equal(plan.rollback.freshnessStatus, "seed_only");
  const evidence = plan.proposed.metadata.freshness_evidence as Record<string, unknown>;
  const marker = evidence.controlled_canary_batch as Record<string, unknown>;
  assert.equal(marker.run_id, PROMOIMMO_RUN_ID);
});

test("rejects canary larger than 50", () => {
  assert.throws(() => selectPromoImmoCanary([baseCandidate], 51));
});

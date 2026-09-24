import assert from "node:assert/strict";
import test from "node:test";
import { mergeOfflineArtifacts } from "../build-offline-200k-reservoir";
import type { SourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

const registry: SourceDomainRegistry = {
  registry_version: "test",
  generated_at: "2026-09-24T00:00:00Z",
  note: "fixture",
  domains: [{
    domain: "example.ma",
    status: "approved_discovery",
    listing_url_patterns: ["^/annonce/\\d+$"],
    blocked_url_patterns: [],
    source_type: "fixture",
    external_web_result: true,
    compliance_note: "fixture",
    reviewed_at: "2026-09-24",
    coverage_cities: null,
  }],
};

test("merges channels, dedupes canonical URLs and excludes restored URLs", () => {
  const restored = new Set(["https://example.ma/annonce/9"]);
  const result = mergeOfflineArtifacts({
    commoncrawlUrls: [
      "http://www.example.ma/annonce/1?utm_source=x",
      "https://example.ma/annonce/2",
      "https://example.ma/category/99",
      "https://example.ma/annonce/9",
    ],
    sitemapRows: [
      { canonical_url: "https://example.ma/annonce/1", observed_at: "2026-09-24T20:00:00Z" },
      { canonical_url: "https://example.ma/annonce/3", observed_at: "2026-09-24T20:01:00Z" },
    ],
    serperRows: [
      {
        canonical_url: "https://example.ma/annonce/1",
        discovery_status: "accepted",
        title: "Appartement à vendre",
        snippet: "90 m2",
        observed_at: "2026-09-24T20:02:00Z",
      },
      { canonical_url: "https://example.ma/annonce/4", discovery_status: "rejected" },
    ],
    restored,
    registry,
  });

  assert.equal(result.rows.length, 3);
  assert.equal(result.excludedRestored, 1);
  assert.equal(result.rejected.not_approved_individual_listing_url, 1);
  assert.equal(result.rejected.search_rejected, 1);

  const one = result.rows.find((row) => row.canonical_url === "https://example.ma/annonce/1");
  assert.ok(one);
  assert.deepEqual(one.evidence_channels, ["commoncrawl_deep", "public_sitemap", "search_api"]);
  assert.equal(one.recovery_status, "reobserved");
  assert.equal(one.observed_at, "2026-09-24T20:02:00Z");

  const two = result.rows.find((row) => row.canonical_url === "https://example.ma/annonce/2");
  assert.equal(two?.recovery_status, "historical_only");

  const three = result.rows.find((row) => row.canonical_url === "https://example.ma/annonce/3");
  assert.equal(three?.recovery_status, "current_url_only");
});

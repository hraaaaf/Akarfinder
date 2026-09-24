import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecoverySeedRows,
  buildStagingSql,
  loadRecoveredCanonicalUrls,
} from "../build-neon-commoncrawl-seed-staging";
import type { SourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

const registry: SourceDomainRegistry = {
  registry_version: "test",
  generated_at: "2026-09-24T00:00:00Z",
  note: "fixture",
  domains: [
    {
      domain: "agenz.ma",
      status: "approved_discovery",
      listing_url_patterns: ["/fr/annonces/.+/\\d+$"],
      blocked_url_patterns: [],
      source_type: "agency_portal",
      external_web_result: true,
      compliance_note: "fixture",
      reviewed_at: "2026-09-24",
      coverage_cities: null,
    },
    {
      domain: "blocked.example",
      status: "blocked",
      listing_url_patterns: ["/listing/\\d+$"],
      blocked_url_patterns: [".*"],
      source_type: "fixture",
      external_web_result: false,
      compliance_note: "fixture",
      reviewed_at: "2026-09-24",
      coverage_cities: null,
    },
  ],
};

test("recovery staging revalidates, dedupes and excludes already-restored URLs", () => {
  const recovered = loadRecoveredCanonicalUrls(JSON.stringify({
    operations: [
      {
        operation: "insert",
        canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/111",
      },
      {
        operation: "skip",
        canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/999",
      },
    ],
  }));

  const input = [
    "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/111",
    "https://www.agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/222?utm_source=x",
    "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/222",
    "https://agenz.ma/fr/acheter/rabat",
    "https://blocked.example/listing/123",
    "not-a-url",
  ].join("\n");

  const built = buildRecoverySeedRows(input, recovered, registry);

  assert.deepEqual(built.rows, [{
    canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/222",
    source_domain: "agenz.ma",
  }]);
  assert.equal(built.counters.input_rows, 6);
  assert.equal(built.counters.already_recovered, 1);
  assert.equal(built.counters.duplicate_input, 1);
  assert.equal(built.counters.pattern_rejected, 1);
  assert.equal(built.counters.policy_rejected, 1);
  assert.equal(built.counters.malformed_rejected, 1);
  assert.equal(built.counters.staged_rows, 1);
});

test("generated SQL is staging-only and never promotes into source_offer_seeds", () => {
  const sql = buildStagingSql([
    {
      canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/222",
      source_domain: "agenz.ma",
    },
  ], {
    commoncrawlIndex: "CC-MAIN-2026-39",
    reservoirSha256: "abc123",
  });

  assert.match(sql, /recovery_commoncrawl_seed_stage_20260924/);
  assert.match(sql, /commoncrawl_cdx/);
  assert.match(sql, /seed_only/);
  assert.match(sql, /expected_stage_rows=1/);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.source_offer_seeds/i);
  assert.doesNotMatch(sql, /property_listings|listing_sources/);
});

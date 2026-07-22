import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMassSeedInsertBatch,
  cdxTimestampToIso,
  selectRegistryMassHarvestDomains,
  validateAndMapMassSeed,
  type CommonCrawlMassSeed,
} from "../../../lib/acquisition-scale-v1/commoncrawl-mass-seeds.js";
import { loadSourceDomainRegistry } from "../../../lib/openserp-ingestion/domain-registry.js";
import { resolveNativeResultLimit } from "../../../lib/openserp-async/openserp-native-client.js";
import { processMassDomainRecords, type MassCdxRecord } from "../../openserp/commoncrawl-registry-mass-harvest.js";

function seed(overrides: Partial<CommonCrawlMassSeed> = {}): CommonCrawlMassSeed {
  return {
    canonical_url: "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
    source_domain: "soukimmobilier.com",
    cdx_indexes_seen: ["CC-MAIN-2026-25"],
    first_cdx_timestamp: "20260601010101",
    last_cdx_timestamp: "20260620020202",
    cdx_observation_count: 2,
    listing_pattern_matched: true,
    status_codes_observed: ["200"],
    mime_observed: ["text/html"],
    ...overrides,
  };
}

test("mass harvest domain set is registry-driven, approved-only, external-only, pattern-only", () => {
  const registry = loadSourceDomainRegistry();
  const domains = selectRegistryMassHarvestDomains(registry);
  assert.ok(domains.includes("soukimmobilier.com"));
  assert.ok(domains.includes("mubawab.ma"));
  assert.equal(domains.includes("yakeey.com"), false);
  assert.equal(domains.includes("logic-immo.com"), false, "empty-pattern domains must not enter CDX mass harvesting");
  for (const domain of domains) {
    const entry = registry.domains.find((candidate) => candidate.domain === domain)!;
    assert.equal(entry.status, "approved_discovery");
    assert.equal(entry.external_web_result, true);
    assert.ok(entry.listing_url_patterns.length > 0);
  }
});

test("CDX timestamps convert deterministically and invalid dates fail closed", () => {
  assert.equal(cdxTimestampToIso("20260601010101"), "2026-06-01T01:01:01.000Z");
  assert.equal(cdxTimestampToIso("20260231010101"), null);
  assert.equal(cdxTimestampToIso("bad"), null);
});

test("a valid approved listing-pattern seed maps only to seed_only storage", () => {
  const mapped = validateAndMapMassSeed(seed(), loadSourceDomainRegistry(), "2026-07-22T00:00:00.000Z");
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.row.seed_provider, "commoncrawl_cdx");
  assert.equal(mapped.row.freshness_status, "seed_only");
  assert.equal(mapped.row.fresh_last_seen_at, null);
  assert.deepEqual(mapped.row.fresh_channels, []);
});

test("blocked domain and category-like path are rejected before seed storage", () => {
  const blocked = validateAndMapMassSeed(seed({
    canonical_url: "https://yakeey.com/fr/annonces/test/123",
    source_domain: "yakeey.com",
  }));
  assert.equal(blocked.ok, false);

  const category = validateAndMapMassSeed(seed({
    canonical_url: "https://soukimmobilier.com/fr/vente/casablanca/maarif",
  }));
  assert.equal(category.ok, false);
  if (!category.ok) assert.equal(category.rejection.reason, "path_not_listing");
});

test("mass seed batch canonical-dedupes and never upgrades freshness", () => {
  const result = buildMassSeedInsertBatch([seed(), seed()]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].freshness_status, "seed_only");
});

test("registry mass processor requires a 200 HTML observation plus listing pattern", () => {
  const good: MassCdxRecord = {
    url: "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
    timestamp: "20260601010101",
    status: "200",
    mime: "text/html",
    index: "CC-MAIN-2026-25",
  };
  const badStatus: MassCdxRecord = { ...good, url: "https://soukimmobilier.com/fr/casablanca/appartement/99999999", status: "404" };
  const category: MassCdxRecord = { ...good, url: "https://soukimmobilier.com/fr/vente/casablanca/maarif" };
  const processed = processMassDomainRecords("soukimmobilier.com", [good, badStatus, category]);
  assert.deepEqual(processed.seeds.map((item) => item.canonical_url), [good.url]);
  assert.equal(processed.counters.qualified_seed_urls, 1);
  assert.equal(processed.counters.no_200_html_rejected, 1);
  assert.equal(processed.counters.non_listing_rejected, 1);
});

test("GitHub-native result depth override supports 50 and clamps at upstream max 100", () => {
  assert.equal(resolveNativeResultLimit(15, {}), 15);
  assert.equal(resolveNativeResultLimit(15, { OPENSERP_NATIVE_RESULT_LIMIT: "50" }), 50);
  assert.equal(resolveNativeResultLimit(15, { OPENSERP_NATIVE_RESULT_LIMIT: "999" }), 100);
  assert.equal(resolveNativeResultLimit(15, { OPENSERP_NATIVE_RESULT_LIMIT: "bad" }), 15);
});

test("GitHub scale runner has Casablanca bootstrap gate and Vercel orchestrator stays free of campaign code", () => {
  const runner = readFileSync(join(process.cwd(), "scripts/openserp/run-ingestion-github-actions.ts"), "utf8");
  const orchestrator = readFileSync(join(process.cwd(), "lib/openserp-ingestion/run-orchestrator.ts"), "utf8");
  assert.ok(runner.includes('MASS_CAMPAIGN_CITY = "Casablanca"'));
  assert.ok(runner.includes("MASS_CAMPAIGN_BOOTSTRAP_TARGET = 5_000"));
  assert.ok(runner.includes('GITHUB_NATIVE_RESULT_LIMIT = "50"'));
  assert.ok(runner.includes("batchSizeOverride: budget.batchSize"));
  assert.equal(orchestrator.includes("MASS_CAMPAIGN_CITY"), false);
  assert.equal(orchestrator.includes("OPENSERP_NATIVE_RESULT_LIMIT"), false);
});

test("Common Crawl mass workflow never grants seeds direct public-listing write paths", () => {
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/commoncrawl-mass-seed-harvest.yml"), "utf8");
  const importer = readFileSync(join(process.cwd(), "scripts/openserp/ingest-commoncrawl-mass-seeds.ts"), "utf8");
  const harvester = readFileSync(join(process.cwd(), "scripts/openserp/commoncrawl-registry-mass-harvest.ts"), "utf8");
  assert.ok(workflow.includes("source_offer_seeds") || workflow.includes("ingest-commoncrawl-mass-seeds"));
  assert.ok(importer.includes('.from("source_offer_seeds")'));
  assert.equal(importer.includes('.from("property_listings")'), false);
  assert.equal(importer.includes('.from("listing_sources")'), false);
  assert.equal(importer.includes('.from("property_clusters")'), false);
  assert.ok(harvester.includes("index.commoncrawl.org"));
  assert.equal(harvester.includes("data.commoncrawl.org"), false, "must not download WARC/page content");
});

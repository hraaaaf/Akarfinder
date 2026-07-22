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
import { buildQueryUniverseV2 } from "../../../lib/openserp-ingestion/query-universe-v2.js";
import { resolveNativeResultLimit } from "../../../lib/openserp-async/openserp-native-client.js";
import {
  MASS_CANARY_DOMAINS,
  buildCdxIndexUrl,
  parseMassCdxJsonLine,
  processMassDomainRecords,
  selectMassHarvestDomains,
  type MassCdxRecord,
} from "../../openserp/commoncrawl-registry-mass-harvest.js";

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

test("Common Crawl canary and remainder partition the approved registry without overlap", () => {
  const all = selectRegistryMassHarvestDomains(loadSourceDomainRegistry());
  const canary = selectMassHarvestDomains(all, "canary");
  const remainder = selectMassHarvestDomains(all, "remainder");

  assert.deepEqual(new Set(canary), new Set(MASS_CANARY_DOMAINS));
  assert.equal(canary.some((domain) => remainder.includes(domain)), false);
  assert.deepEqual(new Set([...canary, ...remainder]), new Set(all));
  assert.equal(selectMassHarvestDomains(all, "all")[0], MASS_CANARY_DOMAINS[0]);
});

test("CDX timestamps convert deterministically and invalid dates fail closed", () => {
  assert.equal(cdxTimestampToIso("20260601010101"), "2026-06-01T01:01:01.000Z");
  assert.equal(cdxTimestampToIso("20260231010101"), null);
  assert.equal(cdxTimestampToIso("bad"), null);
});

test("Common Crawl request and parser use the current CDX mime field", () => {
  const url = buildCdxIndexUrl("soukimmobilier.com", "CC-MAIN-2026-25");
  assert.match(url, /fl=url,timestamp,status,mime,digest/);
  assert.doesNotMatch(url, /mimetype/);

  const parsed = parseMassCdxJsonLine(JSON.stringify({
    url: "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
    timestamp: "20260601010101",
    status: "200",
    mime: "text/html",
    digest: "ABC",
  }), "CC-MAIN-2026-25");
  assert.equal(parsed?.mime, "text/html");
  assert.equal(parsed?.status, "200");

  const legacy = parseMassCdxJsonLine(JSON.stringify({
    url: "https://soukimmobilier.com/fr/casablanca/appartement/12345678",
    timestamp: "20260601010101",
    status: "200",
    mimetype: "text/html",
  }), "CC-MAIN-2026-25");
  assert.equal(legacy?.mime, "text/html");
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

test("GitHub scale runner always materializes the full national V2 universe", () => {
  const runner = readFileSync(join(process.cwd(), "scripts/openserp/run-ingestion-github-actions.ts"), "utf8");
  const orchestrator = readFileSync(join(process.cwd(), "lib/openserp-ingestion/run-orchestrator.ts"), "utf8");
  const universe = buildQueryUniverseV2();
  assert.ok(universe.cities_covered >= 16);
  assert.ok(runner.includes("const universe = buildQueryUniverseV2()"));
  assert.ok(runner.includes("national_hot_lane: true"));
  assert.ok(runner.includes("single_city_exclusive_filter: false"));
  assert.equal(runner.includes("MASS_CAMPAIGN_CITY"), false);
  assert.equal(runner.includes("MASS_CAMPAIGN_BOOTSTRAP_TARGET"), false);
  assert.equal(runner.includes("filter((query) => query.city ==="), false);
  assert.ok(runner.includes('GITHUB_NATIVE_RESULT_LIMIT = "50"'));
  assert.ok(runner.includes("batchSizeOverride: budget.batchSize"));
  assert.equal(orchestrator.includes("OPENSERP_NATIVE_RESULT_LIMIT"), false);
});

test("Common Crawl workflow imports canary before remainder and never grants direct listing writes", () => {
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/commoncrawl-mass-seed-harvest.yml"), "utf8");
  const importer = readFileSync(join(process.cwd(), "scripts/openserp/ingest-commoncrawl-mass-seeds.ts"), "utf8");
  const harvester = readFileSync(join(process.cwd(), "scripts/openserp/commoncrawl-registry-mass-harvest.ts"), "utf8");

  assert.ok(workflow.includes("COMMONCRAWL_MASS_MODE: canary"));
  assert.ok(workflow.includes("Import canary seeds immediately"));
  assert.ok(workflow.includes("COMMONCRAWL_MASS_MODE: remainder"));
  assert.ok(workflow.indexOf("Import canary seeds immediately") < workflow.indexOf("COMMONCRAWL_MASS_MODE: remainder"));
  assert.ok(workflow.includes("source_offer_seeds") || workflow.includes("ingest-commoncrawl-mass-seeds"));
  assert.ok(importer.includes('.from("source_offer_seeds")'));
  assert.equal(importer.includes('.from("property_listings")'), false);
  assert.equal(importer.includes('.from("listing_sources")'), false);
  assert.equal(importer.includes('.from("property_clusters")'), false);
  assert.ok(harvester.includes("index.commoncrawl.org"));
  assert.equal(harvester.includes("data.commoncrawl.org"), false, "must not download WARC/page content");
});

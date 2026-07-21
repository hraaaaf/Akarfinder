// OPENSERP-COMMONCRAWL-BULK-SEED-HARVEST-TOP-SOURCES-1
// Pure unit tests against processDomainRecords()/daragadirStabilityVerdict()
// -- no network access, no page-content fetch of any kind. Proves: CDX
// cross-index duplicate handling, canonical dedupe, strict registry-
// pattern filtering (not the textual lane), malformed URL handling,
// unknown-domain rejection, deterministic output, and the daragadir
// stability heuristic.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  processDomainRecords,
  daragadirStabilityVerdict,
  type CdxRawRecord,
} from "../../openserp/commoncrawl-bulk-seed-harvest.js";

function rec(url: string, timestamp: string, index: string, extra: Partial<CdxRawRecord> = {}): CdxRawRecord {
  return { url, timestamp, index, status: "200", mime: "text/html", ...extra };
}

test("same canonical URL present in 3 indexes -> ONE seed, cdx_indexes_seen contains all 3", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/37786924";
  const records: CdxRawRecord[] = [
    rec(url, "20260601000000", "CC-MAIN-2026-25"),
    rec(url, "20260615000000", "CC-MAIN-2026-21"),
    rec(url, "20260620000000", "CC-MAIN-2026-17"),
  ];
  const { counters, seeds } = processDomainRecords("soukimmobilier.com", records);
  assert.equal(seeds.length, 1);
  assert.equal(counters.canonical_unique_urls, 1);
  assert.deepEqual(seeds[0].cdx_indexes_seen, ["CC-MAIN-2026-17", "CC-MAIN-2026-21", "CC-MAIN-2026-25"].sort());
  assert.equal(seeds[0].cdx_observation_count, 3);
  assert.equal(seeds[0].first_cdx_timestamp, "20260601000000");
  assert.equal(seeds[0].last_cdx_timestamp, "20260620000000");
  assert.equal(counters.cross_index_duplicates, 1);
});

test("CDX duplicate within the SAME index (same URL, re-crawled) collapses into one seed too", () => {
  const url = "https://masaken.ma/fr/immobilier-maroc/rabat/12345";
  const records: CdxRawRecord[] = [
    rec(url, "20260601000000", "CC-MAIN-2026-25"),
    rec(url, "20260602000000", "CC-MAIN-2026-25"),
  ];
  const { counters, seeds } = processDomainRecords("masaken.ma", records);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0].cdx_observation_count, 2);
  assert.equal(counters.cross_index_duplicates, 0, "both observations are from the SAME single index, not cross-index");
});

test("canonical dedupe: two raw URL variants (tracking param, trailing slash) collapse to one canonical seed", () => {
  const records: CdxRawRecord[] = [
    rec("http://atlasimmobilier.com/p/5942?utm_source=fb", "20260601000000", "CC-MAIN-2026-25"),
    rec("https://atlasimmobilier.com/p/5942/", "20260602000000", "CC-MAIN-2026-21"),
  ];
  const { counters, seeds } = processDomainRecords("atlasimmobilier.com", records);
  assert.equal(counters.unique_raw_urls, 2, "2 distinct raw URL strings");
  assert.equal(counters.canonical_unique_urls, 1, "1 canonical URL after dedupe");
  assert.equal(seeds.length, 1);
});

test("strict registry pattern filtering: soukimmobilier.com category URL is rejected (registry pattern, not textual lane)", () => {
  const records: CdxRawRecord[] = [
    rec("https://soukimmobilier.com/fr/vente/rabat/hay-riad", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const { counters, seeds } = processDomainRecords("soukimmobilier.com", records);
  assert.equal(seeds.length, 0);
  assert.equal(counters.listing_pattern_matches, 0);
  assert.equal(counters.non_listing_pattern_rejected, 1);
});

test("masaken.ma: Arabic price-filter URL rejected by strict pattern", () => {
  const records: CdxRawRecord[] = [
    rec("https://masaken.ma/ar/immobilier-maroc/%D8%A7%D9%84%D8%B3%D8%B9%D8%B1/300000", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const { counters } = processDomainRecords("masaken.ma", records);
  assert.equal(counters.listing_pattern_matches, 0);
});

test("atlasimmobilier.com: /q/, /li/, /feature/ ALL rejected -- specifically proves textual-signals lane is NOT used (registry pattern only)", () => {
  const records: CdxRawRecord[] = [
    rec("https://atlasimmobilier.com/q/hivernage", "20260601000000", "CC-MAIN-2026-25"),
    rec("https://atlasimmobilier.com/li/terrains-a-vendre-a-essaouira", "20260601000000", "CC-MAIN-2026-25"),
    rec("https://atlasimmobilier.com/en/feature/apartment-with-terrace-marrakech/", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const { counters, seeds } = processDomainRecords("atlasimmobilier.com", records);
  assert.equal(seeds.length, 0, "not one of these 3 known-category/blog paths should ever qualify as a seed");
  assert.equal(counters.non_listing_pattern_rejected, 3);
});

test("daragadir.com: category page (no final slug, no .html) rejected", () => {
  const records: CdxRawRecord[] = [
    rec("https://daragadir.com/annonces/annonces-immobilieres/vente/locaux-a-vendre-a-agadir", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const { counters } = processDomainRecords("daragadir.com", records);
  assert.equal(counters.listing_pattern_matches, 0);
});

test("malformed URL is rejected and counted, never crashes the harvester", () => {
  const records: CdxRawRecord[] = [
    rec("not a url at all ???", "20260601000000", "CC-MAIN-2026-25"),
    rec("https://soukimmobilier.com/fr/agadir/appartement/1234567", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const { counters } = processDomainRecords("soukimmobilier.com", records);
  assert.equal(counters.malformed_rejected, 1);
  assert.equal(counters.listing_pattern_matches, 1, "the one valid record still processes correctly");
});

test("a URL on a DIFFERENT domain than requested (host mismatch) is rejected, never silently absorbed", () => {
  const records: CdxRawRecord[] = [rec("https://not-soukimmobilier.com/fr/agadir/appartement/1234567", "20260601000000", "CC-MAIN-2026-25")];
  const { counters, seeds } = processDomainRecords("soukimmobilier.com", records);
  assert.equal(seeds.length, 0);
  assert.equal(counters.malformed_rejected, 1);
});

test("an unregistered/unknown domain (not one of the 4) yields zero pattern matches -- getListingUrlPatterns returns [] (fail-closed)", () => {
  const records: CdxRawRecord[] = [rec("https://totally-unregistered-domain.ma/some/path/123", "20260601000000", "CC-MAIN-2026-25")];
  // Cast bypasses the HarvestDomain literal union deliberately -- proves
  // the underlying fail-closed behavior even if a caller passed a domain
  // outside the 4 authorized ones.
  const { counters } = processDomainRecords("totally-unregistered-domain.ma" as never, records);
  assert.equal(counters.listing_pattern_matches, 0);
});

test("known existing candidate is distinguishable from a new seed -- counters start null, populated only by the separate cross-check step", () => {
  const records: CdxRawRecord[] = [rec("https://soukimmobilier.com/fr/agadir/appartement/1234567", "20260601000000", "CC-MAIN-2026-25")];
  const { counters } = processDomainRecords("soukimmobilier.com", records);
  assert.equal(counters.already_known_discovery_candidates, null, "processDomainRecords alone never claims to know DB state");
  assert.equal(counters.potentially_new_seed_urls, null);
});

test("output is deterministic: same input twice produces byte-identical seed order", () => {
  const records: CdxRawRecord[] = [
    rec("https://soukimmobilier.com/fr/rabat/appartement/2222222", "20260601000000", "CC-MAIN-2026-25"),
    rec("https://soukimmobilier.com/fr/agadir/appartement/1111111", "20260601000000", "CC-MAIN-2026-25"),
  ];
  const run1 = processDomainRecords("soukimmobilier.com", records);
  const run2 = processDomainRecords("soukimmobilier.com", [...records].reverse());
  assert.deepEqual(run1.seeds.map((s) => s.canonical_url), run2.seeds.map((s) => s.canonical_url));
  assert.deepEqual(run1.seeds.map((s) => s.canonical_url), [
    "https://soukimmobilier.com/fr/agadir/appartement/1111111",
    "https://soukimmobilier.com/fr/rabat/appartement/2222222",
  ]);
});

test("no page-content fetch path exists in this module (static source check)", () => {
  const source = readFileSync(join(process.cwd(), "scripts/openserp/commoncrawl-bulk-seed-harvest.ts"), "utf8");
  // The word "WARC" appears only in explanatory comments stating it is
  // NEVER downloaded -- assert no actual WARC-handling code (a WARC file
  // extension reference, a warc-parsing import, or a data.commoncrawl.org
  // WARC-segment URL) exists anywhere in the module.
  assert.equal(/\.warc(\.gz)?\b/i.test(source), false, "no .warc file handling");
  assert.equal(/data\.commoncrawl\.org/i.test(source), false, "no direct WARC-segment host reference (that's where page content lives, not the CDX index)");
  // The one and only network call in this file must target the CDX index
  // host, built from a literal template -- never a source domain's own page.
  assert.ok(/await\s+fetchImpl\(url\)/.test(source), "sanity: the file does call fetchImpl(url) somewhere");
  assert.ok(/`https:\/\/index\.commoncrawl\.org\//.test(source), "the fetched URL must be built from the CDX index host literal");
});

test("daragadir stability verdict: HIGH when most seeds are seen across multiple indexes", () => {
  const seeds = [
    { cdx_indexes_seen: ["CC-MAIN-2026-25", "CC-MAIN-2026-21"] },
    { cdx_indexes_seen: ["CC-MAIN-2026-25", "CC-MAIN-2026-17"] },
    { cdx_indexes_seen: ["CC-MAIN-2026-25"] },
  ] as never;
  assert.equal(daragadirStabilityVerdict(seeds), "HIGH");
});

test("daragadir stability verdict: LOW when almost all seeds are single-index-only", () => {
  const seeds = Array.from({ length: 10 }, (_, i) => ({ cdx_indexes_seen: [i === 0 ? "CC-MAIN-2026-25" : "CC-MAIN-2026-21"] })) as never;
  assert.equal(daragadirStabilityVerdict(seeds), "LOW");
});

test("daragadir stability verdict: LOW when zero seeds qualified", () => {
  assert.equal(daragadirStabilityVerdict([]), "LOW");
});

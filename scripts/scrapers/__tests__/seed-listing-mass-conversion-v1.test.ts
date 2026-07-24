import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildBulkSeedConfirmationQuery,
  buildExplicitSeedAdmissionQuery,
  buildSeedConfirmationGroups,
  buildSeedConfirmationQuery,
  extractSeedConfirmationDimensions,
  extractStableSeedIdentifier,
  findExactSeedResult,
  isClearlyOutOfScopeSeedUrl,
  selectBalancedSeedBatch,
  type SeedConfirmationSeed,
} from "../../../lib/acquisition-scale-v1/seed-listing-confirmation.js";

function seed(overrides: Partial<SeedConfirmationSeed> = {}): SeedConfirmationSeed {
  return {
    id: "s1",
    canonical_url: "https://example.ma/fr/p/appartement-a-vendre-casablanca-maarif-120-m2",
    source_domain: "example.ma",
    metadata: null,
    updated_at: "2026-07-22T00:00:00.000Z",
    ...overrides,
  };
}

test("confirmation query is domain-scoped and derived from URL slug without fetching the page", () => {
  const query = buildSeedConfirmationQuery(seed());
  assert.match(query, /^site:example\.ma /);
  assert.match(query, /appartement/);
  assert.match(query, /casablanca/);
  assert.doesNotMatch(query, /utm_/);
});

test("stable identifiers drive precise confirmation queries", () => {
  assert.equal(extractStableSeedIdentifier("https://aykana.ma/property/bureau-neuf-a-louer-casablanca-maarif-ref-4341"), "4341");
  assert.equal(extractStableSeedIdentifier("https://promoimmomarrakech.com/produit/allm-1004/location-appartement-marrakech.html"), "allm-1004");
  assert.equal(extractStableSeedIdentifier("https://barnes-marrakech.com/en/vente/marrakech/2769575"), "2769575");
  assert.equal(buildSeedConfirmationQuery(seed({ source_domain: "aykana.ma", canonical_url: "https://aykana.ma/property/bureau-neuf-a-louer-casablanca-maarif-ref-4341" })), 'site:aykana.ma "4341"');
  assert.equal(buildSeedConfirmationQuery(seed({ source_domain: "barnes-marrakech.com", canonical_url: "https://barnes-marrakech.com/en/vente/marrakech/2769575" })), 'site:barnes-marrakech.com "2769575"');
});

test("obvious holiday-rental seed URLs are excluded from confirmation attempts", () => {
  const holiday = "https://daragadir.com/annonces/location-de-vacances/villas/location-vacances-agadir.html";
  assert.equal(isClearlyOutOfScopeSeedUrl(holiday), true);
  assert.equal(isClearlyOutOfScopeSeedUrl("https://example.ma/property/appartement-a-louer-agadir"), false);
  const selected = selectBalancedSeedBatch([
    seed({ id: "holiday", canonical_url: holiday, source_domain: "daragadir.com" }),
    seed({ id: "normal", canonical_url: "https://example.ma/property/appartement-a-louer-agadir", source_domain: "example.ma" }),
  ], 10);
  assert.deepEqual(selected.map((row) => row.id), ["normal"]);
});

test("bulk confirmation groups same source city transaction and type into one query", () => {
  const rows = [
    seed({ id: "a1", source_domain: "portal.ma", canonical_url: "https://portal.ma/fr/appartement-a-vendre-casablanca-maarif-10001" }),
    seed({ id: "a2", source_domain: "portal.ma", canonical_url: "https://portal.ma/fr/appartement-a-vendre-casablanca-anfa-10002" }),
    seed({ id: "r1", source_domain: "portal.ma", canonical_url: "https://portal.ma/fr/appartement-a-louer-casablanca-anfa-10003" }),
    seed({ id: "v1", source_domain: "portal.ma", canonical_url: "https://portal.ma/fr/villa-a-vendre-rabat-souissi-10004" }),
  ];
  const dimensions = extractSeedConfirmationDimensions(rows[0]);
  assert.deepEqual(dimensions, { city: "Casablanca", transaction_type: "sale", property_type: "apartment" });
  assert.equal(buildBulkSeedConfirmationQuery("portal.ma", dimensions!), 'site:portal.ma "Casablanca" vente appartement');

  const groups = buildSeedConfirmationGroups(rows, 25);
  const casaSale = groups.find((group) => group.mode === "bulk" && group.dimensions?.city === "Casablanca" && group.dimensions.transaction_type === "sale");
  assert.ok(casaSale);
  assert.deepEqual(casaSale.seeds.map((row) => row.id), ["a1", "a2"]);
  assert.equal(groups.filter((group) => group.mode === "bulk").length, 1);
  assert.equal(groups.filter((group) => group.mode === "individual").length, 2);
});

test("bulk groups chunk deterministically and never merge different source domains", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => seed({ id: `a${i}`, source_domain: "a.ma", canonical_url: `https://a.ma/appartement-a-vendre-casablanca-${10000 + i}` })),
    ...Array.from({ length: 2 }, (_, i) => seed({ id: `b${i}`, source_domain: "b.ma", canonical_url: `https://b.ma/appartement-a-vendre-casablanca-${20000 + i}` })),
  ];
  const groups = buildSeedConfirmationGroups(rows, 3).filter((group) => group.mode === "bulk");
  assert.deepEqual(groups.map((group) => [group.source_domain, group.seeds.length]), [["a.ma", 3], ["a.ma", 2], ["b.ma", 2]]);
  assert.ok(groups.every((group) => group.seeds.every((row) => row.source_domain === group.source_domain)));
});

test("only an exact canonical URL hit confirms a seed", () => {
  const target = "https://example.ma/fr/p/listing-123";
  const exact = findExactSeedResult(target, [
    { url: "https://example.ma/fr/p/listing-999", title: "Other", snippet: "", rank: 1 },
    { url: "http://www.example.ma/fr/p/listing-123/?utm_source=test", title: "Exact", snippet: "", rank: 2 },
  ]);
  assert.equal(exact?.title, "Exact");
  assert.equal(findExactSeedResult(target, [{ url: "https://example.ma/fr/p/listing-12", title: "Near", snippet: "", rank: 1 }]), null);
});

test("admission query requires explicit city transaction and property type from SERP evidence", () => {
  const full = buildExplicitSeedAdmissionQuery({
    seed: seed(),
    result: {
      url: "https://example.ma/fr/p/appartement-a-vendre-casablanca-maarif-120-m2",
      title: "Appartement à vendre à Casablanca Maarif - 120 m²",
      snippet: "Appartement 2 chambres à vendre à Casablanca.",
    },
  });
  assert.ok(full);
  assert.equal(full.city, "Casablanca");
  assert.equal(full.transaction_type, "sale");
  assert.equal(full.property_type, "apartment");
  assert.match(full.query_id, /^seed_confirmation_/);

  const missingTransaction = buildExplicitSeedAdmissionQuery({
    seed: seed({ canonical_url: "https://example.ma/fr/p/appartement-casablanca-120-m2" }),
    result: { url: "https://example.ma/fr/p/appartement-casablanca-120-m2", title: "Appartement Casablanca 120 m²", snippet: "Deux chambres" },
  });
  assert.equal(missingTransaction, null);
});

test("balanced queue does not let one large source monopolize the batch", () => {
  const rows: SeedConfirmationSeed[] = [
    ...Array.from({ length: 10 }, (_, i) => seed({ id: `a${i}`, source_domain: "huge.ma", canonical_url: `https://huge.ma/p/agadir-villa-a-vendre-${i}`, updated_at: `2026-07-22T00:00:${String(i).padStart(2, "0")}.000Z` })),
    seed({ id: "c1", source_domain: "small-casa.ma", canonical_url: "https://small-casa.ma/p/appartement-a-vendre-casablanca-1" }),
    seed({ id: "r1", source_domain: "small-rabat.ma", canonical_url: "https://small-rabat.ma/p/villa-a-vendre-rabat-1" }),
  ];
  const selected = selectBalancedSeedBatch(rows, 4);
  assert.equal(selected.length, 4);
  assert.ok(selected.some((row) => row.source_domain === "small-casa.ma"));
  assert.ok(selected.some((row) => row.source_domain === "small-rabat.ma"));
  assert.ok(new Set(selected.map((row) => row.source_domain)).size >= 3);
});

test("worker preserves strict Production gates and uses bounded bulk query budget", () => {
  const worker = readFileSync("scripts/openserp/confirm-seed-listing-candidates.ts", "utf8");
  assert.match(worker, /isOpenSerpIngestionCronAuthorized\(\)/);
  assert.match(worker, /buildSeedConfirmationGroups/);
  assert.match(worker, /findExactSeedResult/);
  assert.match(worker, /decision\.confidence !== "high"/);
  assert.match(worker, /DEFAULT_BATCH_SIZE = 400/);
  assert.match(worker, /DEFAULT_MAX_QUERIES = 40/);
  assert.match(worker, /writeNationalIngestionRun/);
  assert.doesNotMatch(worker, /fetch\(seed\.canonical_url/);
  assert.doesNotMatch(worker, /property_listings"\)\.insert/);
});

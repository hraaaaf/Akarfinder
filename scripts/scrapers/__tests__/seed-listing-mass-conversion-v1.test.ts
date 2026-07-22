import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildExplicitSeedAdmissionQuery,
  buildSeedConfirmationQuery,
  findExactSeedResult,
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
    result: {
      url: "https://example.ma/fr/p/appartement-casablanca-120-m2",
      title: "Appartement Casablanca 120 m²",
      snippet: "Deux chambres",
    },
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

test("worker preserves strict Production gates and existing writer path", () => {
  const worker = readFileSync("scripts/openserp/confirm-seed-listing-candidates.ts", "utf8");
  assert.match(worker, /isOpenSerpIngestionCronAuthorized\(\)/);
  assert.match(worker, /findExactSeedResult/);
  assert.match(worker, /decision\.confidence !== "high"/);
  assert.match(worker, /writeNationalIngestionRun/);
  assert.doesNotMatch(worker, /fetch\(seed\.canonical_url/);
  assert.doesNotMatch(worker, /property_listings"\)\.insert/);
});

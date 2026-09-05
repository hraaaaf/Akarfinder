import assert from "node:assert/strict";
import test from "node:test";

import {
  SEO5C_AGENZ_SOURCE,
  SEO5C_CITY,
  SEO5C_INTENT,
  SEO5C_MAX_DETAIL_LIMIT,
  isSeo5cCasablancaAgenzCandidate,
  selectSeo5cCasablancaAgenzCandidates,
  seo5cAgenzDedupKey,
} from "../seo5c-casablanca-agenz-price-audit";

type Row = Parameters<typeof isSeo5cCasablancaAgenzCandidate>[0];

function candidate(overrides: Partial<Row> = {}): Row {
  return {
    seed_id: "seed-a",
    canonical_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456",
    source_domain: SEO5C_AGENZ_SOURCE,
    normalized_city: SEO5C_CITY,
    normalized_intent: SEO5C_INTENT,
    normalized_price_mad: null,
    normalized_surface_m2: 100,
    updated_at: "2026-09-05T00:00:00Z",
    ...overrides,
  };
}

test("SEO5C candidate contract accepts only Casablanca Agenz sale rows with surface and missing price", () => {
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate()), true);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ source_domain: "mubawab.ma" })), false);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ normalized_city: "Rabat" })), false);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ normalized_intent: "rent" })), false);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ normalized_price_mad: 2_000_000 })), false);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ normalized_surface_m2: null })), false);
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ normalized_surface_m2: 0 })), false);
  assert.equal(
    isSeo5cCasablancaAgenzCandidate(candidate({ canonical_url: "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/123456" })),
    false,
  );
  assert.equal(
    isSeo5cCasablancaAgenzCandidate(candidate({ canonical_url: "https://agenz.ma/fr/annonces/immo-casablanca/location-bureaux/franceville/414945" })),
    false,
  );
  assert.equal(isSeo5cCasablancaAgenzCandidate(candidate({ canonical_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif" })), false);
});

test("SEO5C Agenz audit deduplicates FR/EN variants by numeric listing id", () => {
  assert.equal(
    seo5cAgenzDedupKey(candidate({ canonical_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/987654" })),
    "agenz.ma:987654",
  );
  assert.equal(
    seo5cAgenzDedupKey(candidate({ canonical_url: "https://agenz.ma/en/annonces/immo-casablanca/vente-appartements/maarif/987654" })),
    "agenz.ma:987654",
  );
});

test("SEO5C selector is bounded to 48 unique detail pages", () => {
  const rows = Array.from({ length: 60 }, (_, index) =>
    candidate({
      seed_id: `seed-${index}`,
      canonical_url: `https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/${100000 + index}`,
    }),
  );
  const selected = selectSeo5cCasablancaAgenzCandidates(rows, 100);
  assert.equal(SEO5C_MAX_DETAIL_LIMIT, 48);
  assert.equal(selected.length, 48);
});

test("SEO5C selector skips duplicate listing ids", () => {
  const selected = selectSeo5cCasablancaAgenzCandidates(
    [
      candidate({ seed_id: "fr", canonical_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456" }),
      candidate({ seed_id: "en", canonical_url: "https://agenz.ma/en/annonces/immo-casablanca/vente-appartements/maarif/123456" }),
    ],
    48,
  );
  assert.equal(selected.length, 1);
});

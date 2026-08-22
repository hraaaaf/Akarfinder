import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUniversalCandidatePromotionManifest,
  canonicalizeExternalIndexUrl,
  summarizeUniversalCandidatePromotion,
  type UniversalDiscoveryCandidate,
} from "../universal-candidate-promotion";

const detail: UniversalDiscoveryCandidate = {
  sourceDomain: "agenz.ma",
  provider: "openserp",
  url: "https://www.agenz.ma/fr/annonce/vente-appartement-casablanca-maarif-123456?utm_source=google&gclid=x",
  title: "Appartement à vendre à Casablanca Maarif",
  snippet: null,
  discoveryQuery: null,
  firstSeenAt: "2026-08-01T00:00:00Z",
  lastSeenAt: "2026-08-22T00:00:00Z",
};

test("M1 canonicalization removes tracking only and preserves semantic query params", () => {
  assert.equal(
    canonicalizeExternalIndexUrl("https://WWW.Example.ma/property/123456/?utm_source=x&beds=3&sort=recent#photos"),
    "https://example.ma/property/123456?beds=3&sort=recent",
  );
  assert.equal(canonicalizeExternalIndexUrl("mailto:test@example.ma"), null);
});

test("M1 accepts a sparse Morocco listing detail without requiring rich fields", () => {
  const rows = buildUniversalCandidatePromotionManifest([
    {
      sourceDomain: "sakane.ma",
      provider: "openserp",
      url: "https://sakane.ma/annonce/appartement-vente-casablanca-123456",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.promotionStatus, "EXTERNAL_INDEX_CANDIDATE");
  assert.equal(rows[0]?.classification?.pageKind, "LIKELY_LISTING_DETAIL");
  assert.equal(rows[0]?.classification?.geographyScope, "MOROCCO_LIKELY");
});

test("M1 rejects category/search, social, foreign and geography-unknown surfaces", () => {
  const rows = buildUniversalCandidatePromotionManifest([
    {
      sourceDomain: "mubawab.ma",
      provider: "openserp",
      url: "https://mubawab.ma/search?city=casablanca&type=appartement&transaction=vente",
      title: "Immobilier appartement vente Casablanca",
    },
    {
      sourceDomain: "facebook.com",
      provider: "openserp",
      url: "https://facebook.com/marketplace/item/123456789",
      title: "Appartement à vendre Casablanca",
    },
    {
      sourceDomain: "example.com",
      provider: "openserp",
      url: "https://example.com/property/appartement-vente-paris-123456",
      title: "Appartement à vendre Paris",
    },
    {
      sourceDomain: "example.com",
      provider: "openserp",
      url: "https://example.com/property/apartment-sale-123456",
      title: "Apartment for sale",
    },
  ]);

  assert.deepEqual(
    rows.map((row) => row.rejectionReason).sort(),
    ["EXCLUDED_DOMAIN_ROLE", "FOREIGN_LIKELY", "GEOGRAPHY_UNKNOWN", "NON_LISTING_PAGE"].sort(),
  );
});

test("M1 exact canonical dedup merges provenance without relabeling providers", () => {
  const rows = buildUniversalCandidatePromotionManifest([
    detail,
    {
      ...detail,
      provider: "serper_mass_harvest",
      url: "https://agenz.ma/fr/annonce/vente-appartement-casablanca-maarif-123456?fbclid=y&utm_campaign=z",
      firstSeenAt: "2026-07-28T00:00:00Z",
      lastSeenAt: "2026-08-20T00:00:00Z",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.rawRows, 2);
  assert.deepEqual(rows[0]?.providers, ["openserp", "serper_mass_harvest"]);
  assert.equal(rows[0]?.firstSeenAt, "2026-07-28T00:00:00Z");
  assert.equal(rows[0]?.lastSeenAt, "2026-08-22T00:00:00Z");
  assert.equal(rows[0]?.promotionStatus, "EXTERNAL_INDEX_CANDIDATE");
});

test("M1 rejects invalid URLs explicitly", () => {
  const rows = buildUniversalCandidatePromotionManifest([
    { sourceDomain: "broken.ma", provider: "openserp", url: "not a url", title: "Appartement vente Maroc" },
  ]);
  assert.equal(rows[0]?.canonicalUrl, null);
  assert.equal(rows[0]?.rejectionReason, "INVALID_URL");
});

test("M1 output and accounting are deterministic regardless of input order", () => {
  const input: UniversalDiscoveryCandidate[] = [
    detail,
    {
      sourceDomain: "example.com",
      provider: "openserp",
      url: "https://example.com/property/apartment-sale-123456",
      title: "Apartment for sale",
    },
    {
      ...detail,
      provider: "serper_mass_harvest",
      url: "https://agenz.ma/fr/annonce/vente-appartement-casablanca-maarif-123456?utm_medium=cpc",
    },
  ];

  const forward = buildUniversalCandidatePromotionManifest(input);
  const reverse = buildUniversalCandidatePromotionManifest([...input].reverse());
  assert.deepEqual(forward, reverse);

  assert.deepEqual(summarizeUniversalCandidatePromotion(forward), {
    rawRows: 3,
    canonicalUrls: 2,
    acceptedCanonicalUrls: 1,
    rejectedCanonicalUrls: 1,
    duplicateRowsCollapsed: 1,
    acceptedByDomain: { "agenz.ma": 1 },
    rejectedByReason: {
      INVALID_URL: 0,
      NON_REAL_ESTATE: 0,
      NON_LISTING_PAGE: 0,
      FOREIGN_LIKELY: 0,
      GEOGRAPHY_UNKNOWN: 1,
      EXCLUDED_DOMAIN_ROLE: 0,
    },
    acceptedByProvider: { openserp: 1, serper_mass_harvest: 1 },
  });
});

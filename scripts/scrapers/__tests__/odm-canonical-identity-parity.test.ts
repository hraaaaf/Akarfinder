import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalIdentityKey,
  compareLegacyAndOdm,
} from "../../../lib/odm/odm-dual-read-shadow";

test("canonical identity ignores protocol, www, tracking and query ordering", () => {
  assert.equal(
    canonicalIdentityKey("http://www.example.com/path/?utm_source=x&b=2&a=1#top"),
    canonicalIdentityKey("https://example.com/path?a=1&b=2"),
  );
});

test("Agenz language variants resolve to the same stable offer identity", () => {
  assert.equal(
    canonicalIdentityKey("https://agenz.ma/fr/annonces/immo-casablanca/location-appartements/racine/820044"),
    canonicalIdentityKey("https://www.agenz.ma/en/annonces/immo-casablanca/location-appartements/racine/820044?utm_campaign=x"),
  );
});

test("Mubawab language and slug variants resolve through the offer id", () => {
  assert.equal(
    canonicalIdentityKey("https://mubawab.ma/fr/a/8319422/appartement-meuble-a-louer"),
    canonicalIdentityKey("https://www.mubawab.ma/en/a/8319422/very-nice-furnished-apartment-for-rent"),
  );
});

test("different source offer ids remain distinct", () => {
  assert.notEqual(
    canonicalIdentityKey("https://agenz.ma/fr/annonces/immo-casablanca/location-appartements/racine/820044"),
    canonicalIdentityKey("https://agenz.ma/fr/annonces/immo-casablanca/location-appartements/racine/820045"),
  );
});

test("dual-read comparison uses stable source identity for overlap and trusted fields", () => {
  const legacy = {
    listings: [{
      listing_url: "https://agenz.ma/fr/annonces/immo-casablanca/location-appartements/racine/820044",
      price_mad: 12_000,
      surface_m2: 100,
    }],
  } as never;
  const odm = {
    results: [{
      original_url: "https://www.agenz.ma/en/annonces/immo-casablanca/location-appartements/racine/820044?utm_source=shadow",
      normalized_price_mad: 12_000,
      normalized_surface_m2: 100,
    }],
  } as never;

  const metric = compareLegacyAndOdm("stable", legacy, odm, new Date("2026-07-31T00:00:00Z"));
  assert.equal(metric.canonical_overlap_count, 1);
  assert.equal(metric.canonical_overlap_rate, 1);
  assert.equal(metric.rank_overlap_at_10, 1);
  assert.equal(metric.trusted_price_comparisons, 1);
  assert.equal(metric.trusted_price_divergences, 0);
  assert.equal(metric.trusted_surface_comparisons, 1);
  assert.equal(metric.trusted_surface_divergences, 0);
});

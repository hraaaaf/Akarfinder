import assert from "node:assert/strict";
import test from "node:test";

import type { OpenSerpRawResult } from "../../../lib/openserp-async/types.js";
import { decideAdmission } from "../../../lib/openserp-ingestion/national-admission.js";
import {
  hasMinimumListingFacts,
  MINIMUM_LISTING_PRICE_CEILING_MAD,
} from "../../../lib/openserp-ingestion/minimum-listing-facts.js";
import { IMPLAUSIBLE_PRICE_CEILING_MAD } from "../../../lib/openserp-ingestion/national-writer.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";

function query(overrides: Partial<OpenSerpIngestionQuery> = {}): OpenSerpIngestionQuery {
  return {
    query_id: "minimum-facts-q1",
    city: "Casablanca",
    district: "Maarif",
    transaction_type: "sale",
    property_type: "appartement",
    query_text: "appartement a vendre Casablanca Maarif",
    priority: "high",
    ...overrides,
  };
}

function rawResult(overrides: Partial<OpenSerpRawResult> = {}): OpenSerpRawResult {
  return {
    id: "minimum-facts-r1",
    url: "https://www.mubawab.ma/fr/annonce/maarif-appartement",
    title: "Appartement a vendre Maarif Casablanca",
    snippet: "850000 DH",
    rank: 1,
    ...overrides,
  } as OpenSerpRawResult;
}

test("minimum facts price ceiling stays aligned with the writer safety ceiling", () => {
  assert.equal(MINIMUM_LISTING_PRICE_CEILING_MAD, IMPLAUSIBLE_PRICE_CEILING_MAD);
});

test("explicit ville + quartier + prix qualifies even without surface, rooms, photo or description", () => {
  const decision = decideAdmission({
    result: rawResult(),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-08-25T20:00:00Z",
    fallbackRank: 1,
  });

  assert.equal(decision.classified?.classification_lane, "quarantine");
  assert.equal(decision.classified?.extracted.city, "Casablanca");
  assert.equal(decision.classified?.extracted.district, "Maarif");
  assert.equal(decision.classified?.extracted.price_mad, 850000);
  assert.equal(decision.classified?.extracted.surface_m2, null);
  assert.equal(decision.classified?.extracted.bedrooms_count, null);
  assert.equal(decision.admitted, true);
  assert.equal(decision.confidence, "low");
  assert.ok(decision.reasons.includes("minimum_city_district_price_override"));
});

test("query-inferred district does not masquerade as an explicit listing fact", () => {
  const decision = decideAdmission({
    result: rawResult({
      url: "https://www.mubawab.ma/fr/annonce/casablanca-appartement",
      title: "Appartement a vendre Casablanca",
      snippet: "850000 DH",
    }),
    query: query({ district: "Maarif" }),
    engine: "duckduckgo",
    discovered_at: "2026-08-25T20:00:00Z",
    fallbackRank: 1,
  });

  assert.equal(decision.classified?.extracted.district, "Maarif");
  assert.ok(!decision.classified?.classification_reasons.includes("explicit_district"));
  assert.equal(decision.admitted, false);
});

test("category/search pages remain blocked even when snippet carries ville + quartier + prix", () => {
  const decision = decideAdmission({
    result: rawResult({
      url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",
      title: "Appartement a vendre Maarif Casablanca",
      snippet: "850000 DH",
    }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-08-25T20:00:00Z",
    fallbackRank: 1,
  });

  assert.equal(decision.admitted, false);
  assert.ok(
    decision.reasons.some((reason) =>
      reason === "looks_like_non_listing_page" ||
      reason === "classification_lane_discovery_page"
    ),
  );
});

test("unapproved sources remain blocked despite complete minimum facts", () => {
  const decision = decideAdmission({
    result: rawResult({
      url: "https://unreviewed-example.ma/fr/annonce/maarif-appartement",
    }),
    query: query(),
    engine: "duckduckgo",
    discovered_at: "2026-08-25T20:00:00Z",
    fallbackRank: 1,
  });

  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.includes("domain_status_unclassified"));
});

test("an implausible price cannot unlock the minimum-facts override", () => {
  const classified = {
    classification_reasons: ["explicit_district", "price_signal"],
    extracted: {
      city: "Casablanca",
      district: "Maarif",
      price_mad: MINIMUM_LISTING_PRICE_CEILING_MAD + 1,
    },
  };

  assert.equal(hasMinimumListingFacts(classified), false);
});

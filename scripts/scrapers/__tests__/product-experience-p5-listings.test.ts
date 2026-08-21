import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { LivingHereModel } from "../../../lib/geo/living-here";
import { buildListingExperienceSummary } from "../../../lib/property-detail/listing-experience-summary";
import type { MarketComparableSet } from "../../../lib/property-detail/market-comparables";
import type { PublicPropertyDetailV2 } from "../../../lib/property-detail/public-property-detail-v2";

const PROPERTY_DETAIL = "components/listings/PropertyDetailV2.tsx";
const SUMMARY_COMPONENT = "components/listings/ListingExperienceSummary.tsx";

function detail(): PublicPropertyDetailV2 {
  return {
    provenance: {
      source_name: "Agence Atlas QA",
      fact_provenance_label: "Déclaré par le partenaire",
      source_url: "https://example.com/source",
    },
  } as PublicPropertyDetailV2;
}

test("P5 summary never fabricates market or living-here evidence", () => {
  const cards = buildListingExperienceSummary({ detail: detail(), marketComparables: null, livingHere: null });
  assert.deepEqual(cards.map((card) => card.key), ["confidence", "market", "living"]);
  assert.equal(cards[0]?.primary, "Agence Atlas QA");
  assert.equal(cards[0]?.secondary, "Déclaré par le partenaire");
  assert.equal(cards[1]?.primary, "Repère non calculé");
  assert.match(cards[1]?.secondary ?? "", /insuffisant/i);
  assert.equal(cards[2]?.primary, "Contexte non disponible");
  assert.match(cards[2]?.secondary ?? "", /Aucune proximité n’est inventée/);
});

test("P5 summary surfaces certified comparable evidence and provider-verified POIs only", () => {
  const marketComparables = {
    status: "certified",
    reason: "certified",
    scope: "neighborhood",
    observedAt: "2026-08-20T00:00:00.000Z",
    sampleCount: 4,
    distribution: {
      sampleCount: 4,
      comparableStockCount: 4,
      minPricePerM2: 15000,
      p25PricePerM2: 16000,
      medianPricePerM2: 17000,
      p75PricePerM2: 18000,
      maxPricePerM2: 19000,
      targetPricePerM2: 17029,
      targetPosition: "within_distribution",
      targetGapToMedianPct: 0.17,
    },
    comparables: [],
  } satisfies MarketComparableSet;
  const livingHere = {
    visibility: "full",
    canShowPreciseRouteTimes: true,
    pois: [
      { id: "poi-1", confidence: "provider_verified" },
      { id: "poi-2", confidence: "provider_verified" },
    ],
  } as LivingHereModel;

  const cards = buildListingExperienceSummary({ detail: detail(), marketComparables, livingHere });
  assert.equal(cards[1]?.primary, "17 000 DH/m²");
  assert.equal(cards[1]?.secondary, "Médiane observée · quartier · n=4");
  assert.equal(cards[2]?.primary, "2 repères de proximité");
  assert.match(cards[2]?.secondary ?? "", /temps de trajet disponibles/);
});

test("P5 Listing hierarchy keeps Bien first, Decision and Source before detailed Intelligence on mobile", async () => {
  const source = await readFile(PROPERTY_DETAIL, "utf8");
  const core = source.indexOf("<PropertyCore");
  const summary = source.indexOf("<ListingExperienceSummary");
  const mobileDecision = source.indexOf('data-p5-listing-decision="mobile"');
  const mobileSource = source.indexOf('data-p5-listing-source="mobile"');
  const intelligence = source.indexOf('data-p5-listing-intelligence="detail"');

  assert.ok(core >= 0 && summary > core, "summary must follow PropertyCore");
  assert.ok(mobileDecision > summary, "mobile Decision must follow essential summaries");
  assert.ok(mobileSource > mobileDecision, "mobile Source must follow Decision");
  assert.ok(intelligence > mobileSource, "detailed Intelligence must follow Decision and Source");
  assert.doesNotMatch(source, /mobileIdentityOnly/);
  assert.match(source, /data-p5-listing-decision="desktop"/);
  assert.match(source, /data-p5-listing-source="desktop"/);
});

test("P5 summary component exposes exactly the three canonical summary keys", async () => {
  const source = await readFile(SUMMARY_COMPONENT, "utf8");
  assert.match(source, /data-p5-listing-hierarchy="active"/);
  assert.match(source, /data-p5-listing-summary=\{card\.key\}/);
  assert.match(source, /ListingSourceNote/);
  assert.doesNotMatch(source, /score de confiance|prix estimé|temps de trajet estimé/i);
});

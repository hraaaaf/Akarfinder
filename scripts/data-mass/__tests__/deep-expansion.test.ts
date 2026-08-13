import test from "node:test";
import assert from "node:assert/strict";
import { applyDeepExpansion, detectDeepExpansionPattern } from "../deep-expansion";
import type { CandidateClassification, ReservoirCandidate } from "../reservoir-qualification";

function base(overrides: Partial<CandidateClassification> = {}): CandidateClassification {
  return {
    sourceDomain: "example.ma",
    domainRole: "UNKNOWN",
    pageKind: "AMBIGUOUS",
    geographyScope: "MOROCCO_LIKELY",
    detectedCities: ["Rabat"],
    transactionSignal: "SALE",
    realEstateScore: 3,
    likelyRealEstate: true,
    reasons: ["REAL_ESTATE_ENTITY_SIGNAL", "GEO_MOROCCO_LIKELY"],
    ...overrides,
  };
}

const positives: Array<[string, string]> = [
  ["https://dabaannonce.ma/vente-immobiliere/rabat/villa-neuve-a-vendre-02a46d0b", "DABA_HEX_DETAIL"],
  ["https://marrakechrealty.com/vente/appartement-a-vendre-route-amezmiz", "MARRAKECHREALTY_STATUS_SLUG"],
  ["https://yakeey.com/fr-ma/acheter-appartement-casablanca-beausejour-CA026134", "YAKEEY_ID_SUFFIX"],
  ["https://souqcity.ma/fr/listing-id22465", "SOUQCITY_LISTING_ID"],
  ["https://souqcity.ma/ad/2976/appartement-a-louer", "SOUQCITY_AD_ID"],
  ["https://jibril.immo/biens/appartement-a-louer-a-agadir-hm105lam", "JIBRIL_BIENS_SLUG"],
  ["https://swimmobilier.com/propriete/villa-de-5-chambres-a-vendre-route-de-fes", "SW_PROPRIETE_SLUG"],
  ["https://atlasimmobilier.com/property/projet-immobilier-neuf-a-vendre", "ATLAS_PROPERTY_SLUG"],
  ["https://loco.ma/immobiliers/appartement-meuble-a-louer", "LOCO_IMMOBILIERS_SLUG"],
];

const domains: Record<string, string> = {
  DABA_HEX_DETAIL: "dabaannonce.ma",
  MARRAKECHREALTY_STATUS_SLUG: "marrakechrealty.com",
  YAKEEY_ID_SUFFIX: "yakeey.com",
  SOUQCITY_LISTING_ID: "souqcity.ma",
  SOUQCITY_AD_ID: "souqcity.ma",
  JIBRIL_BIENS_SLUG: "jibril.immo",
  SW_PROPRIETE_SLUG: "swimmobilier.com",
  ATLAS_PROPERTY_SLUG: "atlasimmobilier.com",
  LOCO_IMMOBILIERS_SLUG: "loco.ma",
};

test("MASS-X2 recognizes only locked detail patterns", () => {
  for (const [url, expected] of positives) {
    assert.equal(detectDeepExpansionPattern({ sourceDomain: domains[expected]!, url }), expected);
  }
  assert.equal(detectDeepExpansionPattern({ sourceDomain: "mubawab.ma", url: "https://mubawab.ma/fr/t/rabat" }), null);
  assert.equal(detectDeepExpansionPattern({ sourceDomain: "immo.mitula.ma", url: "https://immo.mitula.ma/immo/location-villa-rabat" }), null);
  assert.equal(detectDeepExpansionPattern({ sourceDomain: "portail-immobilier.ma", url: "https://portail-immobilier.ma/rabat/appartement/a-vendre" }), null);
});

test("MASS-X2 upgrades only Morocco real-estate ambiguous rows", () => {
  const candidate: ReservoirCandidate = {
    sourceDomain: "yakeey.com",
    url: "https://yakeey.com/fr-ma/acheter-appartement-casablanca-beausejour-CA026134",
  };
  const upgraded = applyDeepExpansion(candidate, base());
  assert.equal(upgraded.pageKind, "LIKELY_LISTING_DETAIL");
  assert.equal(upgraded.upgradedByMassX2, true);

  assert.equal(applyDeepExpansion(candidate, base({ pageKind: "LIKELY_CATEGORY_OR_SEARCH" })).upgradedByMassX2, false);
  assert.equal(applyDeepExpansion(candidate, base({ geographyScope: "UNKNOWN" })).upgradedByMassX2, false);
  assert.equal(applyDeepExpansion(candidate, base({ likelyRealEstate: false, realEstateScore: 0 })).upgradedByMassX2, false);
});

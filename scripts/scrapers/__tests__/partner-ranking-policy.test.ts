import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPartnerResultDisplayPolicy,
  isRelevantForIntent,
  rankPartnerResults,
  type PartnerRankingCandidate,
} from "../../../lib/partners/partner-ranking-policy.js";
import {
  FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
  FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
} from "../../../lib/partners/partner-listing-examples.js";

const NOW = new Date("2026-07-05T12:00:00.000Z");

const RENTAL_AGENCY_CASA: PartnerRankingCandidate = {
  id: "agency-rent-casa",
  source: "agency_partner",
  descriptor: {
    ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
    partner_tier: "agency_partner",
    transaction_type: "rent",
    property_type: "apartment",
    city: "Casablanca",
    district: "Maarif",
  },
};

const PROMOTER_NEW_BOUSKOURA: PartnerRankingCandidate = {
  id: "promoter-new-bouskoura",
  source: "promoter_partner",
  descriptor: {
    ...FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
    city: "Bouskoura",
    district: "Bouskoura Centre",
  },
};

const EXTERNAL_RENT_CASA: PartnerRankingCandidate = {
  id: "external-rent-casa",
  source: "web_external",
  descriptor: {
    transaction_type: "rent",
    property_type: "apartment",
    city: "Casablanca",
  },
};

const EXTERNAL_LAND_MARRAKECH: PartnerRankingCandidate = {
  id: "external-land-marrakech",
  source: "web_external",
  descriptor: {
    transaction_type: "sale",
    property_type: "land",
    city: "Marrakech",
  },
};

const PREMIUM_APARTMENT_MARRAKECH: PartnerRankingCandidate = {
  id: "premium-apartment-marrakech",
  source: "agency_premium",
  descriptor: {
    ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
    transaction_type: "sale",
    property_type: "apartment",
    city: "Marrakech",
  },
};

const GENERALIST_AGENCY_BOUSKOURA: PartnerRankingCandidate = {
  id: "generalist-agency-bouskoura",
  source: "agency_partner",
  descriptor: {
    ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
    partner_tier: "agency_partner",
    transaction_type: "sale",
    property_type: "apartment",
    city: "Bouskoura",
  },
};

function ids(results: ReturnType<typeof rankPartnerResults>): string[] {
  return results.map((r) => r.id);
}

describe("partner ranking policy — mandatory cases", () => {
  it("A. location studio Casablanca: rental agency before new-build promoter; relevant external before non-relevant promoter", () => {
    const ranked = rankPartnerResults(
      [PROMOTER_NEW_BOUSKOURA, EXTERNAL_RENT_CASA, RENTAL_AGENCY_CASA],
      { transaction: "rent", city: "Casablanca", property_type: "apartment" },
      NOW,
    );
    const order = ids(ranked);
    assert.ok(
      order.indexOf("agency-rent-casa") < order.indexOf("promoter-new-bouskoura"),
      "rental agency must rank before non-relevant promoter",
    );
    assert.ok(
      order.indexOf("external-rent-casa") < order.indexOf("promoter-new-bouskoura"),
      "relevant external rental must rank before non-relevant promoter",
    );
  });

  it("B. programme neuf Bouskoura: new-build partner promoter before generalist agency", () => {
    const ranked = rankPartnerResults(
      [GENERALIST_AGENCY_BOUSKOURA, PROMOTER_NEW_BOUSKOURA],
      { transaction: "new", city: "Bouskoura" },
      NOW,
    );
    assert.equal(ids(ranked)[0], "promoter-new-bouskoura");
  });

  it("C. terrain Marrakech: relevant land before non-relevant premium apartment", () => {
    const ranked = rankPartnerResults(
      [PREMIUM_APARTMENT_MARRAKECH, EXTERNAL_LAND_MARRAKECH],
      { transaction: "sale", city: "Marrakech", property_type: "land" },
      NOW,
    );
    assert.equal(ids(ranked)[0], "external-land-marrakech");
  });

  it("D. web external result: no image, no contact, no gallery, original source mandatory", () => {
    const policy = getPartnerResultDisplayPolicy("web_external", {
      photos_authorized: true,
      photo_count: 12,
      contact_authorized: true,
      contact_mode: "phone",
    });
    assert.equal(policy.canShowImage, false);
    assert.equal(policy.canShowContact, false);
    assert.equal(policy.canShowGallery, false);
    assert.equal(policy.canShowEnrichedDetails, false);
    assert.equal(policy.mustLinkOriginalSource, true);
  });

  it("E. authorized partner: image, CTA and enriched details only under explicit authorization", () => {
    const authorized = getPartnerResultDisplayPolicy(
      "promoter_partner",
      FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
    );
    assert.equal(authorized.canShowImage, true);
    assert.equal(authorized.canShowContact, true);
    assert.equal(authorized.canShowEnrichedDetails, true);
    assert.equal(authorized.mustLinkOriginalSource, false);

    const unauthorized = getPartnerResultDisplayPolicy("agency_partner", {
      photos_authorized: false,
      photo_count: 0,
      contact_authorized: false,
      contact_mode: "hidden",
    });
    assert.equal(unauthorized.canShowImage, false);
    assert.equal(unauthorized.canShowContact, false);
    assert.equal(unauthorized.canShowEnrichedDetails, true);
  });
});

describe("partner ranking policy — invariants", () => {
  it("a non-relevant partner never passes any relevant result", () => {
    const ranked = rankPartnerResults(
      [PROMOTER_NEW_BOUSKOURA, PREMIUM_APARTMENT_MARRAKECH, EXTERNAL_RENT_CASA, RENTAL_AGENCY_CASA],
      { transaction: "rent", city: "Casablanca" },
      NOW,
    );
    const lastRelevantIndex = ranked.reduce(
      (acc, r, i) => (r.is_relevant ? i : acc),
      -1,
    );
    const firstNonRelevantIndex = ranked.findIndex((r) => !r.is_relevant);
    assert.ok(
      firstNonRelevantIndex === -1 || firstNonRelevantIndex > lastRelevantIndex,
      "all relevant results must precede all non-relevant results",
    );
  });

  it("within relevant results, partners rank before web externals", () => {
    const ranked = rankPartnerResults(
      [EXTERNAL_RENT_CASA, RENTAL_AGENCY_CASA],
      { transaction: "rent", city: "Casablanca" },
      NOW,
    );
    assert.deepEqual(ids(ranked), ["agency-rent-casa", "external-rent-casa"]);
  });

  it("relevance eligibility: rent intent rejects sale and new listings", () => {
    assert.equal(
      isRelevantForIntent({ transaction_type: "new" }, { transaction: "rent" }),
      false,
    );
    assert.equal(
      isRelevantForIntent({ transaction_type: "sale" }, { transaction: "rent" }),
      false,
    );
    assert.equal(
      isRelevantForIntent({ transaction_type: "new" }, { transaction: "sale" }),
      true,
    );
  });

  it("ranking is deterministic for equal scores", () => {
    const a: PartnerRankingCandidate = { ...EXTERNAL_RENT_CASA, id: "ext-b" };
    const b: PartnerRankingCandidate = { ...EXTERNAL_RENT_CASA, id: "ext-a" };
    const ranked = rankPartnerResults([a, b], { transaction: "rent" }, NOW);
    assert.deepEqual(ids(ranked), ["ext-a", "ext-b"]);
  });
});

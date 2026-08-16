import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ANNOUNCEMENT_PAGE_LOT_WEIGHTS,
  createEmptyAnnouncementTruthEvidence,
  evaluateAnnouncementFeature,
} from "@/lib/property-detail/announcement-page-truth-contract-v1";

function allowedBase() {
  const evidence = createEmptyAnnouncementTruthEvidence();
  evidence.page_access_allowed = true;
  return evidence;
}

describe("ANN-L0 roadmap accounting", () => {
  it("weights total exactly 100 percent", () => {
    const total = Object.values(ANNOUNCEMENT_PAGE_LOT_WEIGHTS).reduce((sum, value) => sum + value, 0);
    assert.equal(total, 100);
  });

  it("contains exactly ANN-L0 through ANN-L13", () => {
    assert.deepEqual(Object.keys(ANNOUNCEMENT_PAGE_LOT_WEIGHTS), [
      "ANN-L0",
      "ANN-L1",
      "ANN-L2",
      "ANN-L3",
      "ANN-L4",
      "ANN-L5",
      "ANN-L6",
      "ANN-L7",
      "ANN-L8",
      "ANN-L9",
      "ANN-L10",
      "ANN-L11",
      "ANN-L12",
      "ANN-L13",
    ]);
  });

  it("keeps the canonical roadmap present and aligned with every LOT weight", () => {
    const roadmap = readFileSync("docs/ANNOUNCEMENT_PAGE_ULTRA_PREMIUM_ROADMAP.md", "utf8");
    for (const [lot, weight] of Object.entries(ANNOUNCEMENT_PAGE_LOT_WEIGHTS)) {
      assert.ok(
        roadmap.includes(`| ${lot} | ${weight} % |`),
        `Canonical roadmap must retain ${lot} at ${weight} %`,
      );
    }

    for (const requiredSection of [
      "Vivre ici",
      "Street Reality",
      "AkarEstimate",
      "Finance Maroc",
      "Mon Projet",
      "Architecture providers cible",
      "Contrat de preuve public",
    ]) {
      assert.ok(roadmap.includes(requiredSection), `Canonical roadmap lost required section: ${requiredSection}`);
    }
  });
});

describe("ANN-L0 fail-closed master gate", () => {
  it("denies every feature when public detail access is denied", () => {
    const evidence = createEmptyAnnouncementTruthEvidence();
    const features = [
      "hero_image",
      "full_gallery",
      "exact_map_pin",
      "neighborhood_pois",
      "precise_route_times",
      "street_imagery",
      "akar_score",
      "market_position",
      "price_history",
      "comparables",
      "akar_estimate",
      "professional_identity",
      "direct_contact",
      "finance_simulation",
      "personalized_fit",
    ] as const;

    for (const feature of features) {
      const decision = evaluateAnnouncementFeature(feature, evidence);
      assert.equal(decision.allowed, false, `${feature} must fail closed`);
      assert.equal(decision.reason, "page_access_denied");
    }
  });
});

describe("ANN-L0 media truth", () => {
  it("denies hero when image display permission is absent", () => {
    const evidence = allowedBase();
    evidence.media.usable_image_count = 1;
    assert.equal(evaluateAnnouncementFeature("hero_image", evidence).allowed, false);
  });

  it("allows hero only with display permission and a usable asset", () => {
    const evidence = allowedBase();
    evidence.media.image_display_allowed = true;
    evidence.media.usable_image_count = 1;
    assert.equal(evaluateAnnouncementFeature("hero_image", evidence).allowed, true);
  });

  it("denies a full gallery when gallery permission is absent", () => {
    const evidence = allowedBase();
    evidence.media.image_display_allowed = true;
    evidence.media.usable_image_count = 8;
    assert.equal(evaluateAnnouncementFeature("full_gallery", evidence).allowed, false);
  });

  it("requires both image display permission and at least two assets for a gallery", () => {
    const evidence = allowedBase();
    evidence.media.gallery_allowed = true;
    evidence.media.usable_image_count = 2;
    assert.equal(evaluateAnnouncementFeature("full_gallery", evidence).allowed, false);

    evidence.media.image_display_allowed = true;
    evidence.media.usable_image_count = 1;
    assert.equal(evaluateAnnouncementFeature("full_gallery", evidence).allowed, false);

    evidence.media.usable_image_count = 2;
    assert.equal(evaluateAnnouncementFeature("full_gallery", evidence).allowed, true);
  });
});

describe("ANN-L0 geographic truth", () => {
  it("never exposes an exact property pin from a neighborhood centroid", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "neighborhood_centroid";
    const decision = evaluateAnnouncementFeature("exact_map_pin", evidence);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "exact_geo_required");
  });

  it("requires usable geo, verified POI provider and a valid observation timestamp", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "neighborhood_centroid";
    evidence.nearby.poi_count = 8;
    assert.equal(evaluateAnnouncementFeature("neighborhood_pois", evidence).allowed, false);

    evidence.nearby.provider_verified = true;
    let decision = evaluateAnnouncementFeature("neighborhood_pois", evidence);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "fresh_poi_observation_required");

    evidence.nearby.observed_at = "not-a-date";
    assert.equal(evaluateAnnouncementFeature("neighborhood_pois", evidence).allowed, false);

    evidence.nearby.observed_at = "2026-08-16T03:55:00Z";
    assert.equal(evaluateAnnouncementFeature("neighborhood_pois", evidence).allowed, true);
  });

  it("never promotes city-level proximity to a neighborhood POI claim", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "city_centroid";
    evidence.nearby.provider_verified = true;
    evidence.nearby.poi_count = 20;
    evidence.nearby.observed_at = "2026-08-16T03:55:00Z";
    const decision = evaluateAnnouncementFeature("neighborhood_pois", evidence);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "neighborhood_geo_required");
  });

  it("requires exact origin plus a measured provider route for precise minutes", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "exact";
    evidence.routing.origin_precision = "exact";

    // A Haversine/centroid-derived duration is not a route measurement.
    evidence.routing.provider_verified = false;
    evidence.routing.route_measured = false;
    assert.equal(evaluateAnnouncementFeature("precise_route_times", evidence).allowed, false);

    evidence.routing.provider_verified = true;
    evidence.routing.route_measured = true;
    assert.equal(evaluateAnnouncementFeature("precise_route_times", evidence).allowed, true);
  });

  it("still denies precise route minutes when the origin is a neighborhood centroid", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "neighborhood_centroid";
    evidence.routing.origin_precision = "neighborhood_centroid";
    evidence.routing.provider_verified = true;
    evidence.routing.route_measured = true;
    assert.equal(evaluateAnnouncementFeature("precise_route_times", evidence).allowed, false);
  });
});

describe("ANN-L0 street imagery truth", () => {
  it("rejects street context at city precision even with a provider asset", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "city_centroid";
    evidence.street_imagery.provider_verified = true;
    evidence.street_imagery.attributable_asset_available = true;
    evidence.street_imagery.observed_at = "2026-08-16T03:55:00Z";
    const decision = evaluateAnnouncementFeature("street_imagery", evidence);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "street_context_geo_required");
  });

  it("requires a verified attributable asset and a valid observation timestamp", () => {
    const evidence = allowedBase();
    evidence.geo.precision = "exact";
    evidence.street_imagery.provider_verified = true;
    assert.equal(evaluateAnnouncementFeature("street_imagery", evidence).allowed, false);

    evidence.street_imagery.attributable_asset_available = true;
    let decision = evaluateAnnouncementFeature("street_imagery", evidence);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "street_observation_required");

    evidence.street_imagery.observed_at = "2026-08-16T03:55:00Z";
    assert.equal(evaluateAnnouncementFeature("street_imagery", evidence).allowed, true);
  });
});

describe("ANN-L0 intelligence truth", () => {
  it("renders AkarScore only when a score exists inside the canonical 0..100 range", () => {
    const evidence = allowedBase();
    assert.equal(evaluateAnnouncementFeature("akar_score", evidence).allowed, false);

    evidence.intelligence.akar_score = -1;
    assert.equal(evaluateAnnouncementFeature("akar_score", evidence).allowed, false);

    evidence.intelligence.akar_score = 101;
    assert.equal(evaluateAnnouncementFeature("akar_score", evidence).allowed, false);

    evidence.intelligence.akar_score = 82;
    assert.equal(evaluateAnnouncementFeature("akar_score", evidence).allowed, true);
  });

  it("requires explicit certification for market position and comparables", () => {
    const evidence = allowedBase();
    evidence.intelligence.comparable_count = 5;
    assert.equal(evaluateAnnouncementFeature("market_position", evidence).allowed, false);
    assert.equal(evaluateAnnouncementFeature("comparables", evidence).allowed, false);

    evidence.intelligence.market_position_certified = true;
    evidence.intelligence.comparables_certified = true;
    assert.equal(evaluateAnnouncementFeature("market_position", evidence).allowed, true);
    assert.equal(evaluateAnnouncementFeature("comparables", evidence).allowed, true);
  });

  it("does not fabricate price history from a non-price observation", () => {
    const evidence = allowedBase();
    evidence.history.observation_count = 3;
    assert.equal(evaluateAnnouncementFeature("price_history", evidence).allowed, false);
    evidence.history.price_observation_count = 1;
    assert.equal(evaluateAnnouncementFeature("price_history", evidence).allowed, true);
  });

  it("requires certified estimate with a positive internally valid range", () => {
    const evidence = allowedBase();
    evidence.intelligence.estimate_certified = true;
    evidence.intelligence.estimate_value = 2_000_000;
    evidence.intelligence.estimate_low = 2_100_000;
    evidence.intelligence.estimate_high = 2_300_000;
    assert.equal(evaluateAnnouncementFeature("akar_estimate", evidence).allowed, false);

    evidence.intelligence.estimate_low = -1;
    assert.equal(evaluateAnnouncementFeature("akar_estimate", evidence).allowed, false);

    evidence.intelligence.estimate_low = 1_800_000;
    assert.equal(evaluateAnnouncementFeature("akar_estimate", evidence).allowed, true);
  });
});

describe("ANN-L0 professional, finance and personalization truth", () => {
  it("separates public professional identity from direct contact permission", () => {
    const evidence = allowedBase();
    evidence.professional.public_identity_allowed = true;
    assert.equal(evaluateAnnouncementFeature("professional_identity", evidence).allowed, true);
    assert.equal(evaluateAnnouncementFeature("direct_contact", evidence).allowed, false);
    evidence.professional.direct_contact_allowed = true;
    assert.equal(evaluateAnnouncementFeature("direct_contact", evidence).allowed, true);
  });

  it("requires versioned assumptions before showing finance simulation", () => {
    const evidence = allowedBase();
    assert.equal(evaluateAnnouncementFeature("finance_simulation", evidence).allowed, false);
    evidence.finance.assumptions_versioned = true;
    assert.equal(evaluateAnnouncementFeature("finance_simulation", evidence).allowed, true);
  });

  it("requires both an explicit profile and a calculated result for personalized fit", () => {
    const evidence = allowedBase();
    evidence.personalization.profile_available = true;
    assert.equal(evaluateAnnouncementFeature("personalized_fit", evidence).allowed, false);
    evidence.personalization.fit_calculated = true;
    assert.equal(evaluateAnnouncementFeature("personalized_fit", evidence).allowed, true);
  });
});

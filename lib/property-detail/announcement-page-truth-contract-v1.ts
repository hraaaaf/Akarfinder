export const ANNOUNCEMENT_PAGE_TRUTH_CONTRACT_VERSION = "1.0" as const;

export const ANNOUNCEMENT_PAGE_LOT_WEIGHTS = {
  "ANN-L0": 4,
  "ANN-L1": 7,
  "ANN-L2": 7,
  "ANN-L3": 6,
  "ANN-L4": 9,
  "ANN-L5": 9,
  "ANN-L6": 12,
  "ANN-L7": 6,
  "ANN-L8": 10,
  "ANN-L9": 6,
  "ANN-L10": 7,
  "ANN-L11": 6,
  "ANN-L12": 5,
  "ANN-L13": 6,
} as const;

export type AnnouncementPageLot = keyof typeof ANNOUNCEMENT_PAGE_LOT_WEIGHTS;

export type AnnouncementFeature =
  | "hero_image"
  | "full_gallery"
  | "exact_map_pin"
  | "neighborhood_pois"
  | "precise_route_times"
  | "street_imagery"
  | "akar_score"
  | "market_position"
  | "price_history"
  | "comparables"
  | "akar_estimate"
  | "professional_identity"
  | "direct_contact"
  | "finance_simulation"
  | "personalized_fit";

export type AnnouncementGeoPrecision =
  | "exact"
  | "neighborhood_centroid"
  | "city_centroid"
  | "unknown";

export type AnnouncementTruthEvidence = {
  page_access_allowed: boolean;

  media: {
    image_display_allowed: boolean;
    gallery_allowed: boolean;
    usable_image_count: number;
  };

  geo: {
    precision: AnnouncementGeoPrecision;
  };

  nearby: {
    provider_verified: boolean;
    poi_count: number;
    observed_at: string | null;
  };

  routing: {
    provider_verified: boolean;
    route_measured: boolean;
    origin_precision: AnnouncementGeoPrecision;
  };

  street_imagery: {
    provider_verified: boolean;
    attributable_asset_available: boolean;
    observed_at: string | null;
  };

  intelligence: {
    akar_score: number | null;
    market_position_certified: boolean;
    comparables_certified: boolean;
    comparable_count: number;
    estimate_certified: boolean;
    estimate_value: number | null;
    estimate_low: number | null;
    estimate_high: number | null;
  };

  history: {
    observation_count: number;
    price_observation_count: number;
  };

  professional: {
    public_identity_allowed: boolean;
    direct_contact_allowed: boolean;
  };

  finance: {
    assumptions_versioned: boolean;
  };

  personalization: {
    profile_available: boolean;
    fit_calculated: boolean;
  };
};

export type AnnouncementFeatureDecision = {
  allowed: boolean;
  reason:
    | "allowed"
    | "page_access_denied"
    | "image_not_authorized"
    | "gallery_not_authorized"
    | "exact_geo_required"
    | "neighborhood_geo_required"
    | "verified_poi_provider_required"
    | "fresh_poi_observation_required"
    | "measured_route_required"
    | "street_context_geo_required"
    | "street_asset_required"
    | "street_observation_required"
    | "akar_score_invalid_or_missing"
    | "market_certification_required"
    | "history_missing"
    | "comparables_certification_required"
    | "estimate_certification_required"
    | "professional_identity_not_public"
    | "contact_not_authorized"
    | "versioned_finance_assumptions_required"
    | "personal_profile_and_fit_required";
};

function allow(): AnnouncementFeatureDecision {
  return { allowed: true, reason: "allowed" };
}

function deny(reason: Exclude<AnnouncementFeatureDecision["reason"], "allowed">): AnnouncementFeatureDecision {
  return { allowed: false, reason };
}

function hasValidObservationTimestamp(value: string | null): boolean {
  return value != null && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

/**
 * Fail-closed public rendering contract for the ultra-premium listing detail page.
 *
 * This function does not fetch data and does not mutate runtime state. It only
 * decides whether a public feature may be rendered from already-qualified
 * evidence. UI components must not turn legacy strings, centroids, Haversine
 * distances or provider guesses into stronger public claims.
 */
export function evaluateAnnouncementFeature(
  feature: AnnouncementFeature,
  evidence: AnnouncementTruthEvidence,
): AnnouncementFeatureDecision {
  if (!evidence.page_access_allowed) return deny("page_access_denied");

  switch (feature) {
    case "hero_image":
      return evidence.media.image_display_allowed && evidence.media.usable_image_count > 0
        ? allow()
        : deny("image_not_authorized");

    case "full_gallery":
      return evidence.media.image_display_allowed &&
        evidence.media.gallery_allowed &&
        evidence.media.usable_image_count > 1
        ? allow()
        : deny("gallery_not_authorized");

    case "exact_map_pin":
      return evidence.geo.precision === "exact" ? allow() : deny("exact_geo_required");

    case "neighborhood_pois": {
      const geoIsUsable =
        evidence.geo.precision === "exact" || evidence.geo.precision === "neighborhood_centroid";
      if (!geoIsUsable) return deny("neighborhood_geo_required");
      if (!evidence.nearby.provider_verified || evidence.nearby.poi_count <= 0) {
        return deny("verified_poi_provider_required");
      }
      if (!hasValidObservationTimestamp(evidence.nearby.observed_at)) {
        return deny("fresh_poi_observation_required");
      }
      return allow();
    }

    case "precise_route_times":
      return evidence.geo.precision === "exact" &&
        evidence.routing.origin_precision === "exact" &&
        evidence.routing.provider_verified &&
        evidence.routing.route_measured
        ? allow()
        : deny("measured_route_required");

    case "street_imagery": {
      const geoIsUsable =
        evidence.geo.precision === "exact" || evidence.geo.precision === "neighborhood_centroid";
      if (!geoIsUsable) return deny("street_context_geo_required");
      if (
        !evidence.street_imagery.provider_verified ||
        !evidence.street_imagery.attributable_asset_available
      ) {
        return deny("street_asset_required");
      }
      if (!hasValidObservationTimestamp(evidence.street_imagery.observed_at)) {
        return deny("street_observation_required");
      }
      return allow();
    }

    case "akar_score":
      return evidence.intelligence.akar_score != null &&
        evidence.intelligence.akar_score >= 0 &&
        evidence.intelligence.akar_score <= 100
        ? allow()
        : deny("akar_score_invalid_or_missing");

    case "market_position":
      return evidence.intelligence.market_position_certified
        ? allow()
        : deny("market_certification_required");

    case "price_history":
      return evidence.history.price_observation_count > 0 ? allow() : deny("history_missing");

    case "comparables":
      return evidence.intelligence.comparables_certified && evidence.intelligence.comparable_count > 0
        ? allow()
        : deny("comparables_certification_required");

    case "akar_estimate": {
      const hasRange =
        evidence.intelligence.estimate_value != null &&
        evidence.intelligence.estimate_low != null &&
        evidence.intelligence.estimate_high != null &&
        evidence.intelligence.estimate_low >= 0 &&
        evidence.intelligence.estimate_high > 0 &&
        evidence.intelligence.estimate_low <= evidence.intelligence.estimate_value &&
        evidence.intelligence.estimate_value <= evidence.intelligence.estimate_high;
      return evidence.intelligence.estimate_certified && hasRange
        ? allow()
        : deny("estimate_certification_required");
    }

    case "professional_identity":
      return evidence.professional.public_identity_allowed
        ? allow()
        : deny("professional_identity_not_public");

    case "direct_contact":
      return evidence.professional.direct_contact_allowed ? allow() : deny("contact_not_authorized");

    case "finance_simulation":
      return evidence.finance.assumptions_versioned
        ? allow()
        : deny("versioned_finance_assumptions_required");

    case "personalized_fit":
      return evidence.personalization.profile_available && evidence.personalization.fit_calculated
        ? allow()
        : deny("personal_profile_and_fit_required");
  }
}

export function createEmptyAnnouncementTruthEvidence(): AnnouncementTruthEvidence {
  return {
    page_access_allowed: false,
    media: {
      image_display_allowed: false,
      gallery_allowed: false,
      usable_image_count: 0,
    },
    geo: { precision: "unknown" },
    nearby: {
      provider_verified: false,
      poi_count: 0,
      observed_at: null,
    },
    routing: {
      provider_verified: false,
      route_measured: false,
      origin_precision: "unknown",
    },
    street_imagery: {
      provider_verified: false,
      attributable_asset_available: false,
      observed_at: null,
    },
    intelligence: {
      akar_score: null,
      market_position_certified: false,
      comparables_certified: false,
      comparable_count: 0,
      estimate_certified: false,
      estimate_value: null,
      estimate_low: null,
      estimate_high: null,
    },
    history: {
      observation_count: 0,
      price_observation_count: 0,
    },
    professional: {
      public_identity_allowed: false,
      direct_contact_allowed: false,
    },
    finance: {
      assumptions_versioned: false,
    },
    personalization: {
      profile_available: false,
      fit_calculated: false,
    },
  };
}

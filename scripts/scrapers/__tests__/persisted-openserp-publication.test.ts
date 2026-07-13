import test from "node:test";
import assert from "node:assert/strict";

import {
  canPublishDbRowToPublicSearchSurface,
  canPublishDbRowToPublicSurface,
  canPublishListingToPublicSearchSurface,
  canPublishPersistedExternalListing,
} from "../../../lib/listings/public-listing-access.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import type { DbListingRow } from "../../../lib/listings/db-listings.js";

function withEnv<T>(env: Partial<NodeJS.ProcessEnv>, fn: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function createRow(overrides: Partial<DbListingRow> = {}): DbListingRow {
  return {
    id: 9001,
    canonical_fingerprint: "openserp-fixture",
    title: "Appartement a vendre Casablanca Maarif",
    price_mad: 1850000,
    city: "Casablanca",
    district: "Maarif",
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: 92,
    rooms_count: null,
    bedrooms_count: 2,
    bathrooms_count: 1,
    description_snippet: "Appartement lumineux avec balcon",
    images_count: null,
    thumbnail_url: null,
    seller_name: null,
    data_completeness_score: 78,
    field_confidence: JSON.stringify({
      provider: "openserp",
      acquisition_provider: "openserp",
      publication_lane: "external_web_result",
      classification_lane: "individual_listing",
      source_domain: "agenz.ma",
    }),
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
    duplicate_group_id: null,
    duplicate_score: 0,
    reliability_score: 82,
    reliability_badge: "high",
    reliability_reasons: "[]",
    built_surface_m2: null,
    plot_surface_m2: null,
    condition: null,
    property_age_range: null,
    orientation: null,
    floor_type: null,
    floors_count: null,
    garden_m2: null,
    terrace_m2: null,
    garage_spaces: null,
    has_pool: null,
    has_concierge: null,
    has_moroccan_living_room: null,
    has_european_living_room: null,
    has_equipped_kitchen: null,
    premium_features: "[]",
    source_name: "agenz",
    listing_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456",
    source_url: "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/maarif/123456?utm_source=test",
    ...overrides,
  };
}

test("persisted OpenSERP rows stay hidden from the structured-only guard", () => {
  const row = createRow();
  assert.equal(canPublishDbRowToPublicSurface(row), false);
});

test("persisted OpenSERP rows stay hidden when the feature flag is absent", () => {
  const row = createRow();
  const visible = withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: undefined }, () =>
    canPublishPersistedExternalListing(row),
  );
  assert.equal(visible, false);
});

test("persisted OpenSERP rows stay hidden when the feature flag is false", () => {
  const row = createRow();
  const visible = withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: "false" }, () =>
    canPublishPersistedExternalListing(row),
  );
  assert.equal(visible, false);
});

test("persisted OpenSERP rows become visible on search surfaces when the feature flag is true", () => {
  const row = createRow();

  withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: "true" }, () => {
    assert.equal(canPublishPersistedExternalListing(row), true);
    assert.equal(canPublishDbRowToPublicSearchSurface(row), true);

    const listing = mapDbRowToListing(row);
    assert.equal(canPublishListingToPublicSearchSurface(listing), true);
    assert.equal(listing.source_badge, "external_web_result");
    assert.equal(listing.original_source_required, true);
    assert.deepEqual(listing.allowed_ctas, ["view_original", "view_source", "compare"]);
    assert.equal(listing.listing_url, row.listing_url);
    assert.equal(listing.thumbnail_url, undefined);
    assert.equal(listing.can_show_thumbnail, false);
  });
});

test("persisted OpenSERP rows with invalid metadata stay hidden even when the feature flag is true", () => {
  const row = createRow({
    field_confidence: JSON.stringify({
      provider: "openserp",
      acquisition_provider: "openserp",
      publication_lane: "external_web_result",
      classification_lane: "discovery_page",
    }),
  });

  const visible = withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: "true" }, () =>
    canPublishPersistedExternalListing(row),
  );
  assert.equal(visible, false);
});

test("persisted OpenSERP rows with invalid URLs stay hidden even when the feature flag is true", () => {
  const row = createRow({ listing_url: "javascript:alert(1)" });

  const visible = withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: "true" }, () =>
    canPublishPersistedExternalListing(row),
  );
  assert.equal(visible, false);
});

test("persisted OpenSERP rows never spoof a partner badge", () => {
  const row = createRow();

  withEnv({ PERSISTED_OPENSERP_LISTINGS_ENABLED: "true" }, () => {
    const listing = mapDbRowToListing(row);
    assert.notEqual(listing.source_badge, "premium_partner");
    assert.notEqual(listing.source_badge, "authorized_source");
    assert.equal(listing.source_badge, "external_web_result");
  });
});

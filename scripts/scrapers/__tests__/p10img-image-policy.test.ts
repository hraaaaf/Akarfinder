import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  canDisplayRealImage,
  canDisplayGallery,
  getListingImageMode,
  getImageAttribution,
} from "../../../lib/listings/image-policy.js";
import type { Listing } from "../../../lib/listings/types.js";

function base(): Partial<Listing> {
  return {
    id: "test",
    title: "Test",
    city: "Casablanca",
    neighborhood: "Test",
    price: 1000000,
    currency: "DH",
    surface_m2: 80,
    price_per_m2: 12500,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "À vérifier",
    reliability_score: 70,
    is_mre_friendly: false,
    description: "Test description",
    image_url: "/images/test.jpg",
    reliability_explanation: "Test",
  };
}

// ─── Scenario 1: indexed_only — never show real image ──────────────────────

describe("P10IMG — indexed_only listings", () => {
  test("canDisplayRealImage returns false for indexed_only + unknown", () => {
    const listing = {
      ...base(),
      source_access_level: "indexed_only" as const,
      image_permission_status: "unknown" as const,
      main_image_url: "/images/test.jpg",
    } as Listing;
    assert.equal(canDisplayRealImage(listing), false);
  });

  test("canDisplayGallery returns false for indexed_only", () => {
    const listing = {
      ...base(),
      source_access_level: "indexed_only" as const,
      image_permission_status: "allowed" as const,
      gallery_image_urls: ["/images/a.jpg", "/images/b.jpg"],
    } as Listing;
    assert.equal(canDisplayGallery(listing), false);
  });

  test("getListingImageMode returns fallback_visual for indexed_only", () => {
    const listing = {
      ...base(),
      source_access_level: "indexed_only" as const,
      image_permission_status: "unknown" as const,
    } as Listing;
    assert.equal(getListingImageMode(listing), "fallback_visual");
  });
});

// ─── Scenario 2: unknown permission → fallback ────────────────────────────

describe("P10IMG — unknown permission status", () => {
  test("canDisplayRealImage returns false when permission is unknown", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "unknown" as const,
      main_image_url: "/images/test.jpg",
    } as Listing;
    assert.equal(canDisplayRealImage(listing), false);
  });

  test("getListingImageMode returns fallback_visual for unknown permission", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "unknown" as const,
      main_image_url: "/images/test.jpg",
    } as Listing;
    assert.equal(getListingImageMode(listing), "fallback_visual");
  });
});

// ─── Scenario 3: forbidden permission → fallback ──────────────────────────

describe("P10IMG — forbidden permission status", () => {
  test("canDisplayRealImage returns false when permission is forbidden", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "forbidden" as const,
      main_image_url: "/images/test.jpg",
    } as Listing;
    assert.equal(canDisplayRealImage(listing), false);
  });

  test("getListingImageMode returns fallback_visual for forbidden permission", () => {
    const listing = {
      ...base(),
      source_access_level: "indexed_only" as const,
      image_permission_status: "forbidden" as const,
    } as Listing;
    assert.equal(getListingImageMode(listing), "fallback_visual");
  });
});

// ─── Scenario 4: partner_full + allowed → real image ──────────────────────

describe("P10IMG — partner_full + allowed", () => {
  test("canDisplayRealImage returns true for partner_full + allowed + url", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
      main_image_url: "/images/partner.jpg",
    } as Listing;
    assert.equal(canDisplayRealImage(listing), true);
  });

  test("canDisplayGallery returns true for partner_full + allowed + gallery", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
      gallery_image_urls: ["/images/a.jpg", "/images/b.jpg"],
    } as Listing;
    assert.equal(canDisplayGallery(listing), true);
  });

  test("getListingImageMode returns real_image for partner_full + allowed", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
      main_image_url: "/images/partner.jpg",
    } as Listing;
    assert.equal(getListingImageMode(listing), "real_image");
  });
});

// ─── Scenario 5: preview_allowed + allowed → preview image ────────────────

describe("P10IMG — preview_allowed + allowed", () => {
  test("canDisplayRealImage returns true for preview_allowed + allowed + url", () => {
    const listing = {
      ...base(),
      source_access_level: "preview_allowed" as const,
      image_permission_status: "allowed" as const,
      main_image_url: "/images/preview.jpg",
    } as Listing;
    assert.equal(canDisplayRealImage(listing), true);
  });

  test("canDisplayGallery returns false for preview_allowed (gallery is partner_full only)", () => {
    const listing = {
      ...base(),
      source_access_level: "preview_allowed" as const,
      image_permission_status: "allowed" as const,
      gallery_image_urls: ["/images/a.jpg"],
    } as Listing;
    assert.equal(canDisplayGallery(listing), false);
  });

  test("getListingImageMode returns preview_image for preview_allowed + allowed", () => {
    const listing = {
      ...base(),
      source_access_level: "preview_allowed" as const,
      image_permission_status: "allowed" as const,
      main_image_url: "/images/preview.jpg",
    } as Listing;
    assert.equal(getListingImageMode(listing), "preview_image");
  });
});

// ─── Scenario 6: missing main_image_url → fallback ────────────────────────

describe("P10IMG — missing image URL falls back safely", () => {
  test("canDisplayRealImage returns false when main_image_url is absent", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
    } as Listing;
    assert.equal(canDisplayRealImage(listing), false);
  });

  test("getListingImageMode returns fallback_visual when main_image_url is null", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
      main_image_url: null,
    } as Listing;
    assert.equal(getListingImageMode(listing), "fallback_visual");
  });

  test("canDisplayGallery returns false when gallery_image_urls is empty", () => {
    const listing = {
      ...base(),
      source_access_level: "partner_full" as const,
      image_permission_status: "allowed" as const,
      gallery_image_urls: [],
    } as Listing;
    assert.equal(canDisplayGallery(listing), false);
  });
});

// ─── getImageAttribution ──────────────────────────────────────────────────

describe("P10IMG — getImageAttribution", () => {
  test("returns null when no image_source set", () => {
    const listing = { ...base() } as Listing;
    assert.equal(getImageAttribution(listing), null);
  });

  test("returns the image_source string when set", () => {
    const listing = {
      ...base(),
      image_source: "Partenaire AkarFinder (démo)",
    } as Listing;
    assert.equal(getImageAttribution(listing), "Partenaire AkarFinder (démo)");
  });
});

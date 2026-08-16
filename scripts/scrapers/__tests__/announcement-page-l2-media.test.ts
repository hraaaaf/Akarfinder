import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildPropertyMediaModel,
  isSafePropertyMediaUrl,
} from "@/lib/listings/property-media";
import type { Listing } from "@/lib/listings/types";
import { isSafeOwnerMediaStoragePath } from "@/lib/seller/owner-listing-media";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l2-test",
    title: "Appartement test",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_000_000,
    currency: "DH",
    surface_m2: 120,
    price_per_m2: 16_666,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Test",
    image_url: "",
    reliability_explanation: "Test",
    source_name: "AkarFinder",
    image_permission_status: "unknown",
    source_access_level: "indexed_only",
    can_show_gallery: false,
    can_show_contact: false,
    can_show_thumbnail: false,
    production_allowed: false,
    ...overrides,
  };
}

describe("ANN-L2 media URL safety", () => {
  it("accepts local and HTTP(S) media only", () => {
    assert.equal(isSafePropertyMediaUrl("/demo/properties/a.jpg"), true);
    assert.equal(isSafePropertyMediaUrl("https://example.com/a.jpg?token=abc"), true);
    assert.equal(isSafePropertyMediaUrl("http://example.com/a.jpg"), true);
    assert.equal(isSafePropertyMediaUrl("javascript:alert(1)"), false);
    assert.equal(isSafePropertyMediaUrl("data:image/png;base64,abc"), false);
    assert.equal(isSafePropertyMediaUrl("//evil.example/a.jpg"), false);
  });
});

describe("ANN-L2 fail-closed media projection", () => {
  it("allows a real gallery only with partner_full + explicit gallery capability", () => {
    const value = buildPropertyMediaModel(listing({
      image_permission_status: "allowed",
      source_access_level: "partner_full",
      can_show_gallery: true,
      main_image_url: "/demo/properties/a.jpg",
      gallery_image_urls: ["/demo/properties/b.jpg", "/demo/properties/c.jpg"],
    }));
    assert.equal(value.mode, "gallery");
    assert.equal(value.galleryAllowed, true);
    assert.equal(value.count, 3);
  });

  it("never upgrades partner_full URLs to gallery when can_show_gallery is false", () => {
    const value = buildPropertyMediaModel(listing({
      image_permission_status: "allowed",
      source_access_level: "partner_full",
      can_show_gallery: false,
      main_image_url: "/demo/properties/a.jpg",
      gallery_image_urls: ["/demo/properties/b.jpg"],
    }));
    assert.equal(value.mode, "single_real");
    assert.equal(value.count, 1);
  });

  it("preview_allowed exposes exactly one authorized real image", () => {
    const value = buildPropertyMediaModel(listing({
      image_permission_status: "allowed",
      source_access_level: "preview_allowed",
      can_show_gallery: false,
      main_image_url: "/demo/properties/a.jpg",
      gallery_image_urls: ["/demo/properties/b.jpg", "/demo/properties/c.jpg"],
    }));
    assert.equal(value.mode, "single_real");
    assert.equal(value.galleryAllowed, false);
    assert.deepEqual(value.items.map((item) => item.url), ["/demo/properties/a.jpg"]);
  });

  it("forbidden and unknown image rights always fall back", () => {
    for (const permission of ["forbidden", "unknown"] as const) {
      const value = buildPropertyMediaModel(listing({
        image_permission_status: permission,
        source_access_level: "partner_full",
        can_show_gallery: true,
        main_image_url: "/demo/properties/a.jpg",
        gallery_image_urls: ["/demo/properties/b.jpg"],
      }));
      assert.equal(value.mode, "fallback");
      assert.equal(value.count, 0);
    }
  });

  it("deduplicates gallery URLs and drops unsafe entries", () => {
    const value = buildPropertyMediaModel(listing({
      image_permission_status: "allowed",
      source_access_level: "partner_full",
      can_show_gallery: true,
      main_image_url: "/demo/properties/a.jpg",
      gallery_image_urls: [
        "/demo/properties/a.jpg",
        "javascript:alert(1)",
        "/demo/properties/b.jpg",
        "/demo/properties/b.jpg",
      ],
    }));
    assert.equal(value.mode, "gallery");
    assert.deepEqual(value.items.map((item) => item.url), [
      "/demo/properties/a.jpg",
      "/demo/properties/b.jpg",
    ]);
  });

  it("DB provider thumbnails remain a single preview and never become gallery media", () => {
    const previous = process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
    process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = "true";
    try {
      const value = buildPropertyMediaModel(listing({
        thumbnail_url: "https://provider.example/preview.jpg",
        can_show_thumbnail: true,
        image_permission_status: "unknown",
        source_access_level: "indexed_only",
        can_show_gallery: false,
      }));
      assert.equal(value.mode, "provider_preview");
      assert.equal(value.count, 1);
      assert.equal(value.items[0]?.kind, "provider_preview");
    } finally {
      if (previous == null) delete process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED;
      else process.env.NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED = previous;
    }
  });
});

describe("ANN-L2 owner Storage boundary", () => {
  const draftId = "11111111-1111-4111-8111-111111111111";

  it("accepts only flat objects owned by the exact draft prefix", () => {
    assert.equal(isSafeOwnerMediaStoragePath(draftId, `${draftId}/photo-1.webp`), true);
    assert.equal(isSafeOwnerMediaStoragePath(draftId, `22222222-2222-4222-8222-222222222222/photo.webp`), false);
    assert.equal(isSafeOwnerMediaStoragePath(draftId, `${draftId}/../secret.webp`), false);
    assert.equal(isSafeOwnerMediaStoragePath(draftId, `${draftId}/nested/photo.webp`), false);
    assert.equal(isSafeOwnerMediaStoragePath(draftId, ""), false);
  });
});

describe("ANN-L2 production wiring", () => {
  it("routes the active detail hero through PropertyMediaGallery", () => {
    const detail = readFileSync("components/listings/PropertyDetailV2.tsx", "utf8");
    assert.match(detail, /PropertyMediaGallery/);
    assert.doesNotMatch(detail, /getListingImageMode/);
    assert.doesNotMatch(detail, /<DbProviderThumbnail/);
    assert.doesNotMatch(detail, /<ListingVisual/);
  });

  it("hydrates owner media from live representation draft_id using signed URLs", () => {
    const owner = readFileSync("lib/seller/owner-listing-detail.ts", "utf8");
    const media = readFileSync("lib/seller/owner-listing-media.ts", "utf8");
    assert.match(owner, /draft_id/);
    assert.match(owner, /queryOwnerListingMedia\(data\.draft_id, supabase\)/);
    assert.match(owner, /main_image_url: mainImageUrl/);
    assert.match(owner, /gallery_image_urls: galleryImageUrls/);
    assert.match(owner, /can_show_gallery: mediaUrls\.length > 1/);
    assert.match(media, /createSignedUrls/);
    assert.match(media, /OWNER_LISTING_MEDIA_SIGNED_URL_TTL_SECONDS = 15 \* 60/);
    assert.doesNotMatch(owner, /storage_path:/);
  });

  it("keeps listing detail request-dynamic so signed media is never statically frozen", () => {
    const page = readFileSync("app/listings/[id]/page.tsx", "utf8");
    assert.match(page, /export const dynamic = "force-dynamic"/);
  });
});

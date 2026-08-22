import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const page = source("app/page.tsx");
const section = source("components/home/HomeListingsSection.tsx");

describe("HVR-3 — homepage real listings", () => {
  it("places listings after cities and before neighborhood intelligence", () => {
    const cities = page.indexOf("<CityIntentGrid />");
    const listings = page.indexOf("<HomeListingsSection />");
    const neighborhood = page.indexOf("<SignatureMapSection />");
    assert.ok(cities >= 0 && listings > cities && neighborhood > listings);
  });

  it("uses the existing public search engine, never mock listings", () => {
    assert.ok(section.includes('from "@/lib/search"'));
    assert.ok(section.includes("searchListings({ limit: 8 })"));
    assert.ok(!section.includes("mockListings"));
    assert.ok(!section.includes("mock-listings"));
  });

  it("uses truth-safe discovery wording without unsupported recency claims", () => {
    assert.ok(section.includes("Biens à découvrir"));
    assert.ok(section.includes("Quelques biens actuellement visibles dans AkarFinder."));
    for (const forbidden of ["Biens récents", "Nouveautés", "Recommandés pour vous"]) {
      assert.ok(!section.includes(forbidden), `unsupported wording present: ${forbidden}`);
    }
  });

  it("caps the homepage module at four public representations", () => {
    assert.ok(section.includes("const MAX_HOME_LISTINGS = 4"));
    assert.ok(section.includes(".slice(0, MAX_HOME_LISTINGS)"));
    assert.ok(section.includes("listing.can_show_result !== false"));
    assert.ok(section.includes("listing.production_allowed !== false"));
  });

  it("keeps image rights fail-closed and does not use provider thumbnails", () => {
    assert.ok(section.includes("getListingImageMode"));
    assert.ok(section.includes('mode === "real_image" || mode === "preview_image"'));
    assert.ok(section.includes("PropertyTypeArtwork"));
    assert.ok(section.includes("Illustration"));
    assert.ok(!section.includes("thumbnail_url"));
  });

  it("keeps real destinations and a direct search CTA", () => {
    assert.ok(section.includes("isObservedExternalListing"));
    assert.ok(section.includes("listing.listing_url"));
    assert.ok(section.includes("`/listings/${listing.id}`"));
    assert.ok(section.includes('href="/search"'));
  });

  it("reuses the canonical missing-price formatter", () => {
    assert.ok(section.includes("formatPrice(listing.price, listing.currency)"));
    assert.ok(!section.includes("0 DH"));
  });
});

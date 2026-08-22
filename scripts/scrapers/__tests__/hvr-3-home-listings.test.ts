import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const page = source("app/page.tsx");
const section = source("components/home/HomeListingsSection.tsx");
const workflow = source(".github/workflows/hvr-3-home-listings.yml");

describe("HVR-3 — homepage real listings", () => {
  it("places listings after cities and before neighborhood intelligence", () => {
    const cities = page.indexOf("<CityIntentGrid />");
    const listings = page.indexOf("<HomeListingsSection />");
    const neighborhood = page.indexOf("<SignatureMapSection />");
    assert.ok(cities >= 0 && listings > cities && neighborhood > listings);
  });

  it("uses the canonical Data Mass public representation read-model", () => {
    assert.ok(section.includes('from "@/lib/search-gateway/public-search-cursor"'));
    assert.ok(section.includes("searchPublicRepresentations({ limit: 8 })"));
    assert.ok(!section.includes('from "@/lib/search"'));
    assert.ok(!section.includes("searchListings({ limit: 8 })"));
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

  it("caps the homepage module at four eligible public representations", () => {
    assert.ok(section.includes("const MAX_HOME_LISTINGS = 4"));
    assert.ok(section.includes(".slice(0, MAX_HOME_LISTINGS)"));
    assert.ok(section.includes("listing.can_show_result && listing.production_allowed"));
  });

  it("uses rights-safe local artwork and never provider thumbnails", () => {
    assert.ok(section.includes("PropertyTypeArtwork"));
    assert.ok(section.includes("Illustration"));
    assert.ok(!section.includes("thumbnail_url"));
    assert.ok(!section.includes("can_show_thumbnail ?"));
  });

  it("keeps canonical original destinations and direct search CTA", () => {
    assert.ok(section.includes("listing.original_url"));
    assert.ok(section.includes('target="_blank"'));
    assert.ok(section.includes('href="/search"'));
    assert.ok(!section.includes("`/listings/${listing.id}`"));
  });

  it("reuses canonical missing-price formatting", () => {
    assert.ok(section.includes('formatPrice(listing.normalized_price_mad, "DH")'));
    assert.ok(!section.includes('?? "0 DH"'));
    assert.ok(!section.includes('|| "0 DH"'));
  });

  it("keeps the visual certification snapshot impossible to activate on Vercel", () => {
    assert.ok(section.includes('process.env.GITHUB_ACTIONS === "true"'));
    assert.ok(section.includes('process.env.HVR3_CERTIFICATION_MODE === "true"'));
    assert.ok(section.includes("!process.env.VERCEL"));
    assert.ok(workflow.includes("HVR3_CERTIFICATION_MODE: true"));
  });

  it("labels the certification data as a real canonical snapshot", () => {
    assert.ok(section.includes("HVR3_CERTIFICATION_SNAPSHOT"));
    assert.ok(section.includes("search_public_representations_v2"));
    assert.ok(section.includes("2026-08-22"));
  });
});

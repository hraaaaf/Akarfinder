import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const page = source("app/page.tsx");
const section = source("components/home/HomeListingsSection.tsx");
const workflow = source(".github/workflows/hvr-3-home-listings.yml");

describe("HVR-3 — qualified listings boundary", () => {
  it("keeps the generic listings module off HOME V1", () => {
    assert.ok(!page.includes("HomeListingsSection"));
    assert.ok(page.includes('data-home-standard="home-v1"'));
    assert.ok(page.includes("<HomeVivreIciSection />"));
  });

  it("preserves the dormant canonical Data Mass read-model for a future qualified module", () => {
    assert.ok(section.includes('from "@/lib/search-gateway/public-search-cursor"'));
    assert.ok(section.includes("searchPublicRepresentations({ limit: 8 })"));
    assert.ok(!section.includes('from "@/lib/search"'));
    assert.ok(!section.includes("mockListings"));
  });

  it("keeps truth-safe wording in the dormant component", () => {
    assert.ok(section.includes("Biens à découvrir"));
    for (const forbidden of ["Biens récents", "Nouveautés", "Recommandés pour vous"]) {
      assert.ok(!section.includes(forbidden), `unsupported wording present: ${forbidden}`);
    }
  });

  it("caps the dormant module at four eligible public representations", () => {
    assert.ok(section.includes("const MAX_HOME_LISTINGS = 4"));
    assert.ok(section.includes(".slice(0, MAX_HOME_LISTINGS)"));
    assert.ok(section.includes("listing.can_show_result && listing.production_allowed"));
  });

  it("does not use provider thumbnails without a separate rights/display approval", () => {
    assert.ok(section.includes("PropertyTypeArtwork"));
    assert.ok(!section.includes("thumbnail_url"));
    assert.ok(!section.includes("can_show_thumbnail ?"));
  });

  it("keeps canonical original destinations and missing-price formatting", () => {
    assert.ok(section.includes("listing.original_url"));
    assert.ok(section.includes('formatPrice(listing.normalized_price_mad, "DH")'));
    assert.ok(!section.includes('?? "0 DH"'));
    assert.ok(!section.includes('|| "0 DH"'));
  });

  it("keeps the historical certification snapshot impossible to activate on Vercel", () => {
    assert.ok(section.includes('process.env.GITHUB_ACTIONS === "true"'));
    assert.ok(section.includes('process.env.HVR3_CERTIFICATION_MODE === "true"'));
    assert.ok(section.includes("!process.env.VERCEL"));
    assert.ok(workflow.includes("HVR3_CERTIFICATION_MODE: true"));
  });
});

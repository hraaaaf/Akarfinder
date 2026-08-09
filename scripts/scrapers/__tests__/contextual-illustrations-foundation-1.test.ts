import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  contextualKey,
  type ContextualIllustrationAsset,
  type ContextualIllustrationCatalog,
} from "../../../lib/contextual-illustrations/catalog";
import {
  resolveContextualIllustration,
  resolveContextualIllustrationFromCatalog,
  selectDeterministicAsset,
} from "../../../lib/contextual-illustrations/resolver";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const syntheticAssets: readonly ContextualIllustrationAsset[] = [
  { id: "a1", asset: "/fixtures/a1.svg", label: "A1" },
  { id: "a2", asset: "/fixtures/a2.svg", label: "A2" },
  { id: "a3", asset: "/fixtures/a3.svg", label: "A3" },
  { id: "a4", asset: "/fixtures/a4.svg", label: "A4" },
  { id: "a5", asset: "/fixtures/a5.svg", label: "A5" },
  { id: "a6", asset: "/fixtures/a6.svg", label: "A6" },
];

function syntheticCatalog(): ContextualIllustrationCatalog {
  return {
    districtType: {
      [contextualKey("Agadir", "Founty", "apartment")]: [syntheticAssets[0], syntheticAssets[1]],
    },
    district: {
      [contextualKey("Agadir", "Founty")]: [syntheticAssets[2]],
    },
    cityType: {
      [contextualKey("Agadir", "apartment")]: [syntheticAssets[3], syntheticAssets[4]],
    },
    city: {
      Agadir: [syntheticAssets[5]],
    },
  };
}

describe("CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1", () => {
  it("is deterministic for the same stable listing identity and context", () => {
    const input = {
      stableListingId: "gateway-source-123",
      normalizedCity: "Agadir",
      normalizedPropertyType: "apartment",
    };
    assert.deepEqual(resolveContextualIllustration(input), resolveContextualIllustration(input));
  });

  it("can distribute different stable listing IDs across a multi-asset pool", () => {
    const selected = new Set(
      Array.from({ length: 128 }, (_, index) =>
        selectDeterministicAsset(syntheticAssets, `listing-${index}`)?.id
      )
    );
    assert.ok(selected.size > 1, "stable listing IDs must be capable of selecting different variants");
  });

  it("is independent of candidate ordering", () => {
    const seed = "listing-order-invariance";
    const forward = selectDeterministicAsset(syntheticAssets, seed);
    const reverse = selectDeterministicAsset([...syntheticAssets].reverse(), seed);
    assert.deepEqual(forward, reverse);
  });

  it("does not remap a broader fallback when unused structured signals appear", () => {
    const cityOnlyCatalog: ContextualIllustrationCatalog = {
      districtType: {},
      district: {},
      cityType: {},
      city: { Agadir: syntheticAssets },
    };
    const base = resolveContextualIllustrationFromCatalog(
      { stableListingId: "listing-stable", normalizedCity: "Agadir" },
      cityOnlyCatalog
    );
    const enriched = resolveContextualIllustrationFromCatalog(
      {
        stableListingId: "listing-stable",
        normalizedCity: "Agadir",
        normalizedDistrict: "Founty",
        normalizedPropertyType: "apartment",
      },
      cityOnlyCatalog
    );
    assert.deepEqual(enriched, base, "city fallback must stay stable until a more specific pool actually exists");
  });

  it("uses the most specific certified structured pool and fails closed by tier", () => {
    const catalog = syntheticCatalog();
    const districtType = resolveContextualIllustrationFromCatalog(
      {
        stableListingId: "listing-a",
        normalizedCity: "Agadir",
        normalizedDistrict: "Founty",
        normalizedPropertyType: "apartment",
      },
      catalog
    );
    assert.equal(districtType?.tier, "district_type");

    const unknownDistrict = resolveContextualIllustrationFromCatalog(
      {
        stableListingId: "listing-a",
        normalizedCity: "Agadir",
        normalizedDistrict: "Unknown district",
        normalizedPropertyType: "apartment",
      },
      catalog
    );
    assert.equal(unknownDistrict?.tier, "city_type", "unknown district must not fabricate a district match");

    const unknownType = resolveContextualIllustrationFromCatalog(
      {
        stableListingId: "listing-a",
        normalizedCity: "Agadir",
        normalizedPropertyType: "unknown-type",
      },
      catalog
    );
    assert.equal(unknownType?.tier, "city", "unknown type must fall back to a certified city pool");

    assert.equal(
      resolveContextualIllustrationFromCatalog(
        { stableListingId: "listing-a", normalizedCity: "Unknown city" },
        catalog
      ),
      null
    );
    assert.equal(
      resolveContextualIllustrationFromCatalog(
        { stableListingId: "", normalizedCity: "Agadir" },
        catalog
      ),
      null,
      "missing stable identity must fail closed"
    );
  });

  it("never uses random selection, free-text inference or external assets", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const combined = `${catalog}\n${resolver}\n${artwork}`;

    assert.doesNotMatch(combined, /Math\.random/);
    assert.doesNotMatch(`${catalog}\n${resolver}`, /title|snippet|description/i);
    assert.doesNotMatch(catalog, /https?:\/\//);
    assert.doesNotMatch(catalog, /fetch\s*\(/);
    assert.match(resolver, /stableListingId/);
    assert.match(resolver, /normalizedCity/);
    assert.match(resolver, /normalizedDistrict/);
    assert.match(resolver, /normalizedPropertyType/);
  });

  it("keeps authorized thumbnails authoritative and seeds fallback from result.id", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const thumbnail = card.indexOf("showThumbnail && !thumbError");
    const contextual = card.indexOf("<ContextualListingArtwork");

    assert.match(card, /THUMBNAILS_ENABLED && result\.can_show_thumbnail && !!result\.thumbnail_url/);
    assert.ok(thumbnail >= 0 && contextual > thumbnail, "authorized thumbnail must remain first visual branch");
    assert.match(card, /stableListingId=\{result\.id\}/);
    assert.match(card, /city=\{result\.normalized_city\}/);
    assert.match(card, /propertyType=\{safeFallbackPropertyType\}/);
    assert.doesNotMatch(card, /result\.(district|quartier|neighborhood)/);
  });

  it("preserves property-type and neutral fallbacks", () => {
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    assert.match(artwork, /if \(propertyType\)/);
    assert.match(artwork, /<PropertyTypeArtwork/);
    assert.match(artwork, /data-contextual-neutral/);
    assert.match(artwork, /Annonce indexée/);
  });

  it("keeps the illustration disclosure explicit and compact", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.match(card, /data-contextual-illustration-label/);
    assert.match(card, />\s*Illustration\s*</);
  });

  it("does not touch ranking, commercial priority, eligibility, acquisition, dedupe or map logic", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const combined = `${catalog}\n${resolver}\n${artwork}`;

    assert.doesNotMatch(combined, /ranking|lane_weight|commercial|priority|eligibility|dedupe|source_policy|search gateway|insert\s*\(|update\s*\(|upsert\s*\(|map_eligible/i);
  });

  it("visual certification covers required viewports, overflow, price, label and reload stability", () => {
    const audit = source("scripts/audits/contextual-illustrations-foundation-1-visual.mjs");
    for (const marker of ["360x800", "390x844", "768x900", "1280x900", "1440x900"]) {
      assert.ok(audit.includes(marker), `missing viewport ${marker}`);
    }
    assert.match(audit, /scrollWidth > metrics\.clientWidth/);
    assert.match(audit, /clippedPrices/);
    assert.match(audit, /clippedLabels/);
    assert.match(audit, /page\.reload/);
    assert.match(audit, /data-contextual-asset-id/);
  });

  it("workflow keeps Search predecessor contracts in the gate", () => {
    const workflow = source(".github/workflows/contextual-illustrations-foundation-1.yml");
    for (const predecessor of [
      "contextual-visual-assets-1.test.ts",
      "unified-listing-card-1.test.ts",
      "search-truth-tier.test.ts",
      "serp-gateway-first.test.ts",
      "search-post-results-cleanup-1.test.ts",
    ]) {
      assert.ok(workflow.includes(predecessor), `missing predecessor gate ${predecessor}`);
    }
  });
});

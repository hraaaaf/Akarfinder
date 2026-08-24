import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("CONTEXTUAL-VISUAL-ASSETS-1", () => {
  it("uses only an explicit local city allowlist", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const artwork = source("components/search/ContextualListingArtwork.tsx");

    for (const asset of [
      "/images/cities/agadir.svg",
      "/images/cities/casablanca.svg",
      "/images/fes-card.svg",
      "/images/cities/marrakech.svg",
      "/images/cities/rabat.svg",
      "/images/cities/tanger.svg",
    ]) assert.ok(catalog.includes(asset), `missing approved local asset ${asset}`);

    assert.doesNotMatch(catalog, /https?:\/\//);
    assert.doesNotMatch(catalog, /fetch\s*\(/);
    assert.ok(catalog.includes("city in CONTEXTUAL_CITY_VISUALS"));
    assert.ok(artwork.includes("resolveContextualIllustration"));
  });

  it("never infers contextual media from external result text", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.doesNotMatch(`${catalog}\n${resolver}`, /title|snippet|description/i);
    assert.ok(card.includes("result.original_url"));
    assert.ok(card.includes("href={sourcePages[0].url}"));
    assert.ok(card.includes("href={source.url}"));
    assert.ok(card.includes("data-external-serp-group"));
    assert.doesNotMatch(card, /ContextualListingArtwork|safeFallbackPropertyType|stableRepresentationKey=/);
    assert.doesNotMatch(card, /result\.(district|quartier|neighborhood|title|snippet)/);
  });

  it("keeps the external minimal SERP media-free", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("data-external-serp-group"));
    assert.doesNotMatch(card, /THUMBNAILS_ENABLED|thumbnail_url|showThumbnail|data-card-image/);
    assert.doesNotMatch(card, /ContextualListingArtwork|PropertyTypeArtwork|<img|<Image/);
    assert.doesNotMatch(card, /normalized_price_mad|normalized_surface_m2/);
  });

  it("keeps contextual fallbacks available only to surfaces that still use them", () => {
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("AkarFinder indexe la page et vous renvoie vers la source originale."));
    assert.ok(card.includes("Ouvrir la source"));
    assert.ok(card.includes("Voir les {sourcePages.length} pages"));
    assert.ok(artwork.includes("data-contextual-neutral"));
    assert.ok(artwork.includes("Annonce indexée"));
    assert.ok(artwork.includes("if (propertyType)"));
  });

  it("does not alter ranking, eligibility, source policy or data", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const combined = `${card}\n${artwork}\n${catalog}\n${resolver}`;

    assert.doesNotMatch(combined, /computeRankingScore|compareRecommendedListings|lane_weight|ranking_score/i);
    assert.doesNotMatch(combined, /source_policy_registry|display_eligibility|insert\s*\(|update\s*\(|upsert\s*\(/i);
  });
});

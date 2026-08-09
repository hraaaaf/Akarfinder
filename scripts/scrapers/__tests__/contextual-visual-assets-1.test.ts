import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("CONTEXTUAL-VISUAL-ASSETS-1", () => {
  it("uses only an explicit local city allowlist", () => {
    const artwork = source("components/search/ContextualListingArtwork.tsx");

    for (const asset of [
      "/images/cities/agadir.svg",
      "/images/cities/casablanca.svg",
      "/images/fes-card.svg",
      "/images/cities/marrakech.svg",
      "/images/cities/rabat.svg",
      "/images/cities/tanger.svg",
    ]) assert.ok(artwork.includes(asset), `missing approved local asset ${asset}`);

    assert.doesNotMatch(artwork, /https?:\/\//);
    assert.doesNotMatch(artwork, /fetch\s*\(/);
    assert.doesNotMatch(artwork, /Math\.random|crypto|hash/i);
    assert.ok(artwork.includes("city in CONTEXTUAL_CITY_VISUALS"));
  });

  it("never infers context from title, snippet or arbitrary text", () => {
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.doesNotMatch(artwork, /title|snippet|description/i);
    assert.ok(card.includes("getContextualCityVisual(result.normalized_city)"));
    assert.ok(card.includes("city={result.normalized_city}"));
    assert.ok(card.includes("propertyType={safeFallbackPropertyType}"));
  });

  it("keeps provider thumbnail policy authoritative before contextual fallback", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const thumbnail = card.indexOf("showThumbnail && !thumbError");
    const contextual = card.indexOf("<ContextualListingArtwork");

    assert.ok(card.includes("THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url"));
    assert.ok(thumbnail >= 0 && contextual > thumbnail, "authorized thumbnail must remain first visual branch");
    assert.ok(card.includes("showFallback = !showThumbnail || thumbError"));
  });

  it("labels every generated fallback as illustrative and keeps a neutral fail-closed state", () => {
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("data-contextual-illustration-label"));
    assert.ok(card.includes("Visuel illustratif"));
    assert.ok(artwork.includes("data-contextual-neutral"));
    assert.ok(artwork.includes("Annonce indexée"));
    assert.ok(artwork.includes("if (propertyType)"));
  });

  it("does not alter ranking, eligibility, source policy or data", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    const combined = `${card}\n${artwork}`;

    assert.doesNotMatch(combined, /computeRankingScore|compareRecommendedListings|lane_weight|ranking_score/i);
    assert.doesNotMatch(combined, /source_policy_registry|display_eligibility|insert\s*\(|update\s*\(|upsert\s*\(/i);
  });
});

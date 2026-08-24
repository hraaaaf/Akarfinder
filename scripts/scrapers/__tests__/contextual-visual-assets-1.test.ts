import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("CONTEXTUAL-VISUAL-ASSETS-1", () => {
  it("keeps the contextual artwork library explicit and local for surfaces that still use it", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const artwork = source("components/search/ContextualListingArtwork.tsx");
    assert.doesNotMatch(catalog, /https?:\/\//);
    assert.doesNotMatch(catalog, /fetch\s*\(/);
    assert.ok(artwork.includes("resolveContextualIllustration"));
  });

  it("external indexed SERP does not infer or fabricate visual context", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("THUMBNAILS_ENABLED && result.can_show_thumbnail && !!result.thumbnail_url"));
    assert.doesNotMatch(card, /ContextualListingArtwork|stableRepresentationKey|data-contextual-illustration-label|Illustration/);
    assert.doesNotMatch(card, /result\.(district|quartier|neighborhood)/);
  });

  it("authorized thumbnail remains the only external image branch", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("showThumbnail && !thumbError"));
    assert.ok(card.includes('data-visual-inventory-class="authorized_or_listing_image"'));
    assert.doesNotMatch(card, /showFallback|ContextualListingArtwork/);
  });

  it("does not alter ranking, eligibility, source policy or data", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.doesNotMatch(card, /computeRankingScore|compareRecommendedListings|lane_weight|ranking_score/i);
    assert.doesNotMatch(card, /source_policy_registry|display_eligibility|insert\s*\(|update\s*\(|upsert\s*\(/i);
  });
});

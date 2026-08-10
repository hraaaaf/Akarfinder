import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("SEARCH-ACTION-HIERARCHY-1", () => {
  it("uses the whole card as the single strong action and removes oversized CTA blocks", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-card-primary-link"));
    assert.ok(card.includes('className="absolute inset-0 z-10'));
    assert.doesNotMatch(card, /data-card-primary-action/);
    assert.doesNotMatch(card, /Voir le bien[\s\S]*bg-gradient-to-br|Voir l’annonce originale[\s\S]*bg-gradient-to-br/);
    assert.doesNotMatch(card, /Repérer sur la carte|CompareToggleButton/);
  });

  it("preserves source access as discreet attribution rather than a second large CTA", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-secondary-source-link"));
    assert.ok(card.includes("publicAttribution.combinedLabel"));
    assert.ok(card.includes('target="_blank"'));
    assert.ok(card.includes('rel="noopener noreferrer"'));
    assert.doesNotMatch(card, />\s*Voir la source\s*</);
  });

  it("preserves Search to Map continuity without a dedicated card button", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes('hoverListing(listing, "list")'));
    assert.ok(card.includes("clearHover"));
    assert.ok(card.includes("isActive(listing)"));
    assert.ok(card.includes('data-property-active={active ? "true" : "false"}'));
  });

  it("preserves favorite, truth and deterministic attribution", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("FavoriteToggleButton"));
    assert.ok(card.includes("getSearchTruthPresentation(listing)"));
    assert.ok(card.includes("deriveListingPublicAttribution(listing)"));
    assert.ok(card.includes("data-public-attribution"));
  });

  it("keeps the external Gateway card as one direct source action", () => {
    const external = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(external.includes("publicAttribution.primaryCtaLabel"));
    assert.ok(external.includes("href={result.original_url}"));
    assert.ok(external.includes('target="_blank"'));
    assert.doesNotMatch(external, /Repérer sur la carte|CompareToggleButton/);
  });
});

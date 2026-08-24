import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

function positionOrFail(content: string, needle: string) {
  const position = content.indexOf(needle);
  assert.notEqual(position, -1, `Missing external SERP contract marker: ${needle}`);
  return position;
}

describe("UNIFIED-LISTING-CARD-1", () => {
  it("keeps external indexed results on the Option B source-safe scan hierarchy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    const generatedTitle = positionOrFail(card, "{title}");
    const metadata = positionOrFail(card, "{intent ? <span>{intent}</span>");
    const sourceDomains = positionOrFail(card, "visibleDomains.map");
    const disclaimer = positionOrFail(card, "AkarFinder indexe la page et vous renvoie vers la source originale.");
    const action = positionOrFail(card, "Ouvrir la source");

    assert.ok(generatedTitle < metadata, "generated title must precede normalized metadata");
    assert.ok(metadata < sourceDomains, "normalized metadata must precede source domains");
    assert.ok(sourceDomains < disclaimer, "source domains must precede the index-only disclaimer");
    assert.ok(disclaimer < action, "source action must remain after the disclaimer");
  });

  it("fails visibly closed for external minimal results", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("buildGeneratedTitle(representative)"));
    assert.ok(card.includes("result.normalized_city"));
    assert.ok(card.includes("result.normalized_property_type"));
    assert.ok(card.includes("result.normalized_intent"));
    assert.doesNotMatch(card, /result\.title|result\.snippet|normalized_price_mad|normalized_surface_m2/);
    assert.doesNotMatch(card, /thumbnail_url|data-card-image|ContextualListingArtwork|PropertyTypeArtwork/);
    assert.ok(card.includes("AkarFinder indexe la page et vous renvoie vers la source originale."));
  });

  it("preserves secure original-source navigation without fabricated external media", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("href={sourcePages[0].url}"));
    assert.ok(card.includes("href={source.url}"));
    assert.ok(card.includes('target="_blank"'));
    assert.ok(card.includes('rel="noopener noreferrer"'));
    assert.doesNotMatch(card, /data-card-image|ContextualListingArtwork|PropertyTypeArtwork|THUMBNAILS_ENABLED/);
    assert.doesNotMatch(card, /href=\{?['"]\/listings\//);
  });

  it("keeps provenance deterministic instead of rendering payload labels directly", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("getSourceDomain(result)"));
    assert.ok(card.includes("result.original_url"));
    assert.doesNotMatch(card, /\{result\.source_name\}/);
    assert.doesNotMatch(card, /\{result\.result_attribution_label\}/);
    assert.doesNotMatch(card, /\{result\.primary_cta_label\}/);
    assert.doesNotMatch(card, /badge=\{result\.source_badge\}/);
  });

  it("does not introduce ranking or commercial-priority logic into the card", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.doesNotMatch(card, /computeRankingScore|compareRecommendedListings|commercial[_-]priority/i);
    assert.doesNotMatch(card, /premium promoter|agence partenaire|promoteur premium/i);
  });
});

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
  it("keeps external indexed results on the source-first SERP hierarchy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    const sourceHost = positionOrFail(card, "data-external-source-host");
    const title = positionOrFail(card, "data-external-result-title");
    const metadata = positionOrFail(card, "data-external-result-metadata");
    const disclaimer = positionOrFail(card, "data-external-minimal-disclaimer");
    const action = positionOrFail(card, "Ouvrir la source");

    assert.ok(sourceHost < title, "SOURCE must precede TITLE");
    assert.ok(title < metadata, "TITLE must precede METADATA");
    assert.ok(metadata < disclaimer, "METADATA must precede the minimal disclaimer");
    assert.ok(disclaimer < action, "ACTION must remain the final scan step");
  });

  it("fails visibly closed for external minimal results", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("const richFacts = presentation.isMinimal"));
    assert.ok(card.includes("? []"));
    assert.ok(card.includes("Prix, photos et détails à vérifier sur la source."));
    assert.ok(card.includes("presentation.displayUrl || publicAttribution.sourceLabel"));
    assert.ok(card.includes('data-external-result-mode={presentation.isMinimal ? "minimal" : "rich"}'));
  });

  it("preserves same-tab source navigation without fabricated external media", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("href={result.original_url}"));
    assert.doesNotMatch(card, /target=["']_blank["']/);
    assert.doesNotMatch(card, /rel=["']noopener noreferrer["']/);
    assert.doesNotMatch(card, /data-card-image/);
    assert.doesNotMatch(card, /ContextualListingArtwork|PropertyTypeArtwork|THUMBNAILS_ENABLED/);
    assert.doesNotMatch(card, /href=\{?['"]\/listings\//);
  });

  it("keeps provenance deterministic instead of rendering payload labels directly", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("deriveGatewayPublicAttribution(result)"));
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
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

function positionOrFail(content: string, needle: string) {
  const position = content.indexOf(needle);
  assert.notEqual(position, -1, `Missing unified card contract marker: ${needle}`);
  return position;
}

describe("UNIFIED-LISTING-CARD-1", () => {
  it("keeps the external Search card on the inventory-first decision hierarchy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    const image = positionOrFail(card, "showThumbnail && !thumbError");
    const title = positionOrFail(card, '<h3 className="mt-1.5');
    const location = positionOrFail(card, 'result.normalized_city || "Localisation non précisée"');
    const facts = positionOrFail(card, "facts.length > 0");
    const price = positionOrFail(card, "formatIndexedPrice(result.normalized_price_mad)");
    const provenance = positionOrFail(card, "data-public-attribution-type");
    const action = positionOrFail(card, 'href={result.original_url}');

    assert.ok(action < image, "the whole card must remain the external action target");
    assert.ok(image < title, "IMAGE must precede TITLE");
    assert.ok(title < location, "TITLE must precede LOCATION");
    assert.ok(location < facts, "LOCATION must precede FACTS");
    assert.ok(facts < price, "FACTS must precede PRICE");
    assert.ok(price < provenance, "PRICE must precede PROVENANCE");
    assert.doesNotMatch(card, /AkarInfoPassportCard/);
  });

  it("fails visibly closed when normalized facts are unavailable", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("Prix non communiqué"));
    assert.ok(card.includes("Localisation non précisée"));
    assert.ok(card.includes("Informations à compléter"));
    assert.ok(card.includes("Informations limitées"));
    assert.ok(card.includes("publicAttribution.typeLabel"));
    assert.ok(card.includes("publicAttribution.sourceLabel"));
    assert.ok(card.includes("Comparez les sources"));
  });

  it("preserves external-source safety and thumbnail policy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const artwork = source("components/search/ContextualListingArtwork.tsx");

    assert.ok(card.includes("href={result.original_url}"));
    assert.ok(card.includes('target="_blank"'));
    assert.ok(card.includes('rel="noopener noreferrer"'));
    assert.ok(card.includes("THUMBNAILS_ENABLED && result.can_show_thumbnail"));
    assert.ok(card.includes("<ContextualListingArtwork"));
    assert.ok(artwork.includes("<PropertyTypeArtwork"));
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

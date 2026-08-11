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
  it("keeps the external Search card on the canonical decision hierarchy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    const image = positionOrFail(card, "data-card-image");
    const price = positionOrFail(card, "data-card-price");
    const title = positionOrFail(card, "data-card-title");
    const location = positionOrFail(card, "data-card-location");
    const facts = positionOrFail(card, "data-card-facts");
    const provenance = positionOrFail(card, "data-card-provenance");
    const passport = positionOrFail(card, "<AkarInfoPassportCard passport={passport}");
    const action = positionOrFail(card, "data-card-action");

    assert.ok(image < price, "IMAGE must precede PRICE");
    assert.ok(price < title, "PRICE must precede TITLE");
    assert.ok(title < location, "TITLE must precede LOCATION");
    assert.ok(location < facts, "LOCATION must precede FACTS");
    assert.ok(facts < provenance, "FACTS must precede PROVENANCE");
    assert.ok(provenance < action, "PROVENANCE must precede ACTION");
    assert.ok(passport < action, "ACTION must remain the final desktop decision step");
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

  it("preserves same-tab source navigation and thumbnail policy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const artwork = source("components/search/ContextualListingArtwork.tsx");

    assert.ok(card.includes("href={result.original_url}"));
    assert.doesNotMatch(card, /target=["']_blank["']/);
    assert.doesNotMatch(card, /rel=["']noopener noreferrer["']/);
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
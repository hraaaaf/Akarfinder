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

    const image = positionOrFail(card, "showThumbnail && !thumbError");
    const price = positionOrFail(card, "formatIndexedPrice(result.normalized_price_mad)");
    const title = positionOrFail(card, '<h3 className="mt-1.5');
    const location = positionOrFail(card, 'result.normalized_city || "Localisation non précisée"');
    const facts = positionOrFail(card, "facts.length > 0");
    const provenance = positionOrFail(card, "Source externe · {result.result_attribution_label}");
    const passport = positionOrFail(card, "<AkarInfoPassportCard passport={passport}");
    const action = positionOrFail(card, "{result.primary_cta_label}");

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
    assert.ok(card.includes("Source externe"));
    assert.ok(card.includes("Comparez les sources"));
  });

  it("preserves external-source safety and thumbnail policy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("href={result.original_url}"));
    assert.ok(card.includes('target="_blank"'));
    assert.ok(card.includes('rel="noopener noreferrer"'));
    assert.ok(card.includes("THUMBNAILS_ENABLED && result.can_show_thumbnail"));
    assert.ok(card.includes("PropertyTypeArtwork kind={safeFallbackPropertyType}"));
    assert.doesNotMatch(card, /href=\{?['"]\/listings\//);
  });

  it("does not introduce ranking or commercial-priority logic into the card", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.doesNotMatch(card, /computeRankingScore|compareRecommendedListings|commercial[_-]priority/i);
    assert.doesNotMatch(card, /premium promoter|agence partenaire|promoteur premium/i);
  });
});

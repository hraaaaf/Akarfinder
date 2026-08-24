import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UNIFIED-LISTING-CARD-1", () => {
  it("uses the dedicated external SERP hierarchy instead of portal-card hierarchy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("data-external-serp-row"));
    assert.ok(card.includes("data-card-provenance"));
    assert.ok(card.includes("data-card-title"));
    assert.ok(card.includes("data-card-facts"));
    assert.ok(card.includes("data-card-action"));
    assert.doesNotMatch(card, /AkarInfoPassportCard|data-card-price|data-card-location/);
  });

  it("fails closed by omission instead of inventing missing external facts", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("Informations minimales indexées"));
    assert.doesNotMatch(card, /Prix non communiqué|Localisation non précisée|Informations à compléter|Prix indicatif/);
    assert.ok(card.includes("publicAttribution.typeLabel"));
    assert.ok(card.includes("publicAttribution.sourceLabel"));
  });

  it("preserves same-tab source navigation and authorized-thumbnail-only policy", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("href={result.original_url}"));
    assert.doesNotMatch(card, /target=["']_blank["']/);
    assert.ok(card.includes("THUMBNAILS_ENABLED && result.can_show_thumbnail"));
    assert.doesNotMatch(card, /ContextualListingArtwork|data-contextual-illustration-label/);
    assert.doesNotMatch(card, /href=\{?['"]\/listings\//);
  });

  it("keeps provenance deterministic instead of rendering payload labels directly", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("deriveGatewayPublicAttribution(result)"));
    assert.ok(card.includes("data-public-attribution-type"));
    assert.ok(card.includes("data-public-attribution-source"));
    assert.doesNotMatch(card, /\{result\.source_name\}/);
    assert.doesNotMatch(card, /\{result\.result_attribution_label\}/);
    assert.doesNotMatch(card, /\{result\.primary_cta_label\}/);
  });

  it("does not introduce ranking or commercial-priority logic into the row", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.doesNotMatch(card, /computeRankingScore|compareRecommendedListings|commercial[_-]priority/i);
    assert.doesNotMatch(card, /premium promoter|agence partenaire|promoteur premium/i);
  });
});

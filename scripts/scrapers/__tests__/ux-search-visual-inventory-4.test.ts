import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveContextualIllustration } from "../../../lib/contextual-illustrations/resolver";

const cities = ["Agadir", "Marrakech", "Casablanca", "Rabat", "Tanger", "Fès"] as const;

test("UX-SEARCH-4 keeps the truth-safe visual precedence explicit on internal cards", async () => {
  const source = await readFile("components/search/SearchListingCardDark.tsx", "utf8");
  assert.match(source, /resolveRabatRealPhoto/);
  assert.match(source, /resolveContextualIllustration/);
  assert.match(source, /imageMode === "fallback_visual" && !showNeighborhoodPhoto/);
  assert.match(source, /stableRepresentationKey: listing\.listing_url \?\? ""/);
  assert.match(source, /normalizedCity: listing\.city/);
  assert.match(source, /normalizedDistrict: listing\.neighborhood/);
  assert.match(source, /normalizedPropertyType: listing\.property_type/);
  assert.match(source, /data-visual-inventory-class="neighborhood_photo"/);
  assert.match(source, /data-visual-inventory-class="contextual_illustration"/);
  assert.match(source, /data-visual-inventory-class="generic_illustration"/);
  assert.match(source, /Illustration contextuelle/);
  assert.doesNotMatch(source, /resolveContextualIllustration\([\s\S]{0,400}(listing\.title|listing\.description)/);
  assert.doesNotMatch(source, /Math\.random/);
});

test("UX-SEARCH-4 exposes one common visual-inventory marker contract to Gateway fallbacks", async () => {
  const contextual = await readFile("components/search/ContextualListingArtwork.tsx", "utf8");
  const external = await readFile("components/search/ExternalIndexedResultCard.tsx", "utf8");
  assert.match(contextual, /data-visual-inventory-class="contextual_illustration"/);
  assert.match(contextual, /data-visual-inventory-class="generic_illustration"/);
  assert.match(contextual, /data-visual-inventory-class="neutral"/);
  assert.match(external, /data-visual-inventory-class="authorized_or_listing_image"/);
});

test("UX-SEARCH-4 contextual pools are deterministic and materially diverse for all six certified cities", () => {
  for (const city of cities) {
    const ids = new Set<string>();
    for (let index = 0; index < 24; index += 1) {
      const propertyType = index % 2 === 0 ? "Appartement" : "Villa";
      const result = resolveContextualIllustration({
        stableRepresentationKey: `https://fixture.example/${encodeURIComponent(city)}/${index}`,
        normalizedCity: city,
        normalizedPropertyType: propertyType,
      });
      assert.ok(result, `${city} should resolve contextual artwork`);
      assert.equal(result.tier, "city_type");
      ids.add(result.id);
      const replay = resolveContextualIllustration({
        stableRepresentationKey: `https://fixture.example/${encodeURIComponent(city)}/${index}`,
        normalizedCity: city,
        normalizedPropertyType: propertyType,
      });
      assert.equal(replay?.id, result.id, `${city}/${index} must be stable across reloads`);
    }
    assert.ok(ids.size >= 5, `${city} should distribute across at least five city/type assets, got ${ids.size}`);
  }
});

test("UX-SEARCH-4 remains fail-closed outside the contextual city allowlist", () => {
  const result = resolveContextualIllustration({
    stableRepresentationKey: "https://fixture.example/oujda/1",
    normalizedCity: "Oujda",
    normalizedPropertyType: "Appartement",
  });
  assert.equal(result, null);
});

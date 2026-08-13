import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-CARDS-CONTENT-1 source contract", () => {
  const css = fs.readFileSync("app/search/search-premium-card-content.css", "utf8");
  const page = fs.readFileSync("app/search/page.tsx", "utf8");
  const card = fs.readFileSync("components/search/SearchListingCardDark.tsx", "utf8");
  assert.match(page, /search-premium-card-content\.css/);
  assert.match(css, /UX-PREMIUM-CARDS-CONTENT-1/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-price\]/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-title\]/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-location\]/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-facts\]/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-provenance\]/);
  assert.match(card, /formatPrice\(smartCard.price, listing.currency\)/);
  assert.match(card, /smartCard.title/);
  assert.match(card, /smartCard.locationLabel/);
  assert.match(card, /smartCard.facts\.slice\(0, 3\)/);
  assert.match(card, /smartCard.freshnessLabel/);
  assert.match(card, /data-public-attribution/);
});

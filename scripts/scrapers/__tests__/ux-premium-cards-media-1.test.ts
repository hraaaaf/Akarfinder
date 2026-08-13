import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-CARDS-MEDIA-1 source contract", () => {
  const css = fs.readFileSync("app/search/search-density.css", "utf8");
  const card = fs.readFileSync("components/search/SearchListingCardDark.tsx", "utf8");

  assert.match(css, /UX-PREMIUM-CARDS-MEDIA-1/);
  assert.match(css, /\[data-mobile-compact-card\] \[data-card-image\]/);
  assert.match(css, /height: 160px !important/);
  assert.match(css, /height: 190px !important/);
  assert.match(css, /height: 188px !important/);
  assert.match(css, /backdrop-filter: blur\(12px\)/);

  assert.match(card, /getListingImageMode\(listing\)/);
  assert.match(card, /image_permission_status/);
  assert.match(card, /data-visual-inventory-class=/);
  assert.match(card, /data-card-image/);
  assert.match(card, /data-card-favorite/);
  assert.match(card, /Photo d’ambiance/);
  assert.match(card, /Visuel illustratif/);
});

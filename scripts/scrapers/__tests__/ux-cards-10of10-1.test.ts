import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync("components/search/SearchListingCardDark.tsx", "utf8");

test("listing card exposes stable visual audit hooks without changing listing semantics", () => {
  assert.match(card, /data-search-listing-card/);
  assert.match(card, /data-card-image/);
  assert.match(card, /data-card-price/);
  assert.match(card, /data-card-title/);
  assert.match(card, /data-card-location/);
  assert.match(card, /data-card-facts/);
  assert.match(card, /data-card-favorite/);
  assert.match(card, /data-card-primary-action/);
  assert.match(card, /FavoriteToggleButton listingId=\{listing\.id\} variant="icon"/);
  assert.match(card, /event_name: "search_result_click"/);
  assert.match(card, /isObservedExternalListing\(listing\)/);
  assert.match(card, /listing\.allowed_ctas\.includes\("view_original"\)/);
});

test("cards use the certified light blue visual language instead of the legacy bronze shell", () => {
  assert.match(card, /bg-white/);
  assert.match(card, /border-slate-200\/90/);
  assert.match(card, /border-\[#8fb1dc\]/);
  assert.match(card, /sm:hover:border-\[#9ab8de\]/);
  assert.match(card, /sm:text-\[#2f63a4\]/);
  assert.match(card, /group-hover:text-\[#2f63a4\]/);
  assert.match(card, /bg-\[#eef5fd\]/);
  assert.match(card, /text-\[#285b99\]/);
  assert.doesNotMatch(card, /bronze-/);
});

test("partial truth disclosure stays semantic but uses the AkarFinder blue language instead of amber", () => {
  const start = card.indexOf('if (tier === "partial")');
  assert.ok(start >= 0, "partial truth style must remain explicit");
  const partialBlock = card.slice(start, start + 260);
  assert.match(partialBlock, /border-\[#8fb1dc\]\/60/);
  assert.match(partialBlock, /bg-\[#eaf2fb\]\/90/);
  assert.match(partialBlock, /text-\[#285b99\]/);
  assert.doesNotMatch(partialBlock, /amber|orange|bronze/i);
});

test("card hierarchy remains scan-first and compact", () => {
  assert.match(card, /data-card-image className="relative h-\[164px\].*sm:h-\[196px\]"/);
  assert.match(card, /data-card-title className="line-clamp-2/);
  assert.match(card, /data-card-location[\s\S]*?<span className="truncate">\{smartCard\.locationLabel\}<\/span>/);
  assert.match(card, /smartCard\.facts\.slice\(0, 3\)/);
  assert.match(card, /rounded-md border border-slate-200\/80 bg-slate-50/);
  assert.match(card, /data-card-primary-action[\s\S]*?min-h-11/);
});

test("favorite control keeps a full touch target and is never visually scaled down", () => {
  const favoriteStart = card.indexOf("data-card-favorite");
  assert.ok(favoriteStart >= 0, "favorite audit hook must be present");
  const favoriteBlock = card.slice(favoriteStart, favoriteStart + 240);
  assert.doesNotMatch(favoriteBlock, /scale-90/);
});

test("responsive listing inventory is 2 / 2 / 3 / 4 across mobile, tablet, intermediate desktop and wide desktop", () => {
  assert.match(card, /@media \(max-width: 639px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(card, /@media \(min-width: 640px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(card, /@media \(min-width: 960px\)[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(card, /@media \(min-width: 1280px\)[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

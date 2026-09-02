import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const shell = readFileSync("components/favorites/FavoritesPageShell.tsx", "utf8");
const page = readFileSync("app/favorites/page.tsx", "utf8");

describe("Mockup convergence L3 Favorites contracts", () => {
  it("keeps the real favorites lifecycle and empty state", () => {
    assert.match(shell, /useFavoriteSelection/);
    assert.match(shell, /\/api\/search\?limit=200/);
    assert.match(shell, /removeFavoriteId/);
    assert.match(shell, /clearFavoriteIds/);
    assert.match(shell, /data-favorites-empty/);
  });

  it("uses real transaction_type for populated segmentation", () => {
    assert.match(shell, /ListingTransactionType/);
    assert.match(shell, /listing\.transaction_type === filter/);
    assert.match(shell, /À vendre/);
    assert.match(shell, /À louer/);
    assert.match(shell, /Neuf/);
    assert.doesNotMatch(shell, /fake|placeholder count|mock segment/i);
  });

  it("ships a dense two-column mobile favorites grid", () => {
    assert.match(shell, /grid grid-cols-2/);
    assert.match(shell, /data-favorites-grid/);
    assert.match(shell, /h-\[132px\]/);
    assert.match(shell, /data-favorite-card/);
  });

  it("keeps the mobile functional viewport clear of the secondary footer", () => {
    assert.match(page, /hidden sm:block/);
    assert.match(page, /data-favorites-secondary-footer/);
  });

  it("keeps compare and explicit removal available", () => {
    assert.match(shell, /\/compare\?add=/);
    assert.match(shell, /Comparer/);
    assert.match(shell, /Retirer/);
  });
});

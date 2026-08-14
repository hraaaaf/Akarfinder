import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Favoris uses transverse premium primitives", () => {
  const page = fs.readFileSync("app/favorites/page.tsx", "utf8");
  const shell = fs.readFileSync("components/favorites/FavoritesPageShell.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(page, /ui\.pageLight/);
  assert.match(shell, /ui\.surfacePremium/);
  assert.match(shell, /ui\.primaryActionPill/);
  assert.match(shell, /ui\.secondaryActionPill/);
  assert.match(shell, /ui\.emptyState/);

  assert.match(shell, /removeFavoriteId/);
  assert.match(shell, /clearFavoriteIds/);
  assert.match(shell, /\/compare\?add=/);
  assert.match(shell, /href="\/compare"/);
  assert.match(shell, /data-favorites-compare-entry/);
  assert.match(shell, /Ouvrir le comparateur/);
  assert.match(shell, /#visite/);

  assert.doesNotMatch(shell, /bronze/i);
  assert.doesNotMatch(shell, /deepblue/i);
});

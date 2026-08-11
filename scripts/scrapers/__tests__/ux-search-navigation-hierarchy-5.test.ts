import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("UX-SEARCH-5 scopes the compact fluid global header to Search", async () => {
  const page = await readFile("app/search/page.tsx", "utf8");
  assert.match(page, /<SiteHeader variant="light" compact fluid searchMode \/>/);
});

test("UX-SEARCH-5 keeps the global header complete while reducing its Search visual weight", async () => {
  const source = await readFile("components/layout/SiteHeader.tsx", "utf8");
  assert.match(source, /fluid\?: boolean/);
  assert.match(source, /data-search-global-header=\{compact \? "compact" : undefined\}/);
  assert.match(source, /compact \? "py-1\.5 sm:py-2"/);
  assert.match(source, /h-\[23px\].*sm:h-\[28px\]/s);
  assert.match(source, /compact \? "gap-2\.5 xl:gap-3\.5" : "gap-4"/);
  assert.match(source, /bg-white\/\[0\.08\]/);
  for (const label of ["Acheter", "Louer", "Neuf", "Recherche", "Plus", "Publier", "Mon projet"]) {
    assert.ok(source.includes(label), `navigation item ${label} must remain available`);
  }
  assert.match(source, /href="\/favorites"/);
  assert.match(source, /"Mes favoris"/);
  assert.match(source, /"Ouvrir le menu"/);
  assert.match(source, /isTransparent \? "fixed left-0 right-0 top-0" : "sticky top-0 z-30"/);
});

test("UX-SEARCH-5 adds fluid alignment without changing the default Container contract", async () => {
  const source = await readFile("components/ui/Container.tsx", "utf8");
  assert.match(source, /fluid\?: boolean/);
  assert.match(source, /fluid = false/);
  assert.match(source, /fluid \? "max-w-none px-4 sm:px-6" : "max-w-7xl px-5 sm:px-6 lg:px-8"/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getPriceExplorerResult, priceExplorerChangesRanking } from "../../../lib/ux/price-explorer";

test("price explorer never converts registry row count into a statistical sample", () => {
  const result = getPriceExplorerResult({
    city: "Casablanca",
    neighborhood: null,
    propertyType: "appartement",
    transactionType: "buy",
  });

  if (result.status === "available") {
    assert.equal(result.sampleSize, null);
    assert.equal(result.sampleLabel, "Échantillon non publié");
    assert.equal(result.confidence, "non publiée");
  }
});

test("price explorer blocks unsupported rental references", () => {
  const result = getPriceExplorerResult({
    city: "Casablanca",
    propertyType: "appartement",
    transactionType: "rent",
  });

  assert.equal(result.status, "unsupported_transaction");
  assert.equal(result.askingPricePerM2, null);
});

test("price explorer does not synthesize a range when dispersion is unpublished", () => {
  const result = getPriceExplorerResult({
    city: "Casablanca",
    propertyType: "appartement",
    transactionType: "buy",
  });

  if (result.status === "available") {
    assert.equal(result.rangeLow, null);
    assert.equal(result.rangeHigh, null);
  }
});

test("price explorer requires a local scope and supported property type", () => {
  assert.equal(
    getPriceExplorerResult({ city: "all", propertyType: "appartement", transactionType: "buy" }).status,
    "unpublished",
  );
  assert.equal(
    getPriceExplorerResult({ city: "Casablanca", propertyType: "terrain", transactionType: "buy" }).status,
    "unsupported_property_type",
  );
});

test("price explorer remains presentation-only and does not add a ranking path", () => {
  assert.equal(priceExplorerChangesRanking(), false);
  const shell = readFileSync(resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/PriceExplorerPanel.tsx"), "utf8");
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const rankingCalls = shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? [];

  assert.equal(rankingCalls.length, 1);
  assert.ok(!panel.includes("sortListings("));
  assert.ok(!dock.includes("sortListings("));
});

test("public disclosure distinguishes asking references from transaction prices", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/ux/price-explorer.ts"), "utf8");
  assert.match(source, /prix demandé/i);
  assert.match(source, /prix de transaction/i);
  assert.ok(!source.includes("sample_count"));
});

test("search page mounts the price explorer and canonical session notifies it", () => {
  const page = readFileSync(resolve(process.cwd(), "app/search/page.tsx"), "utf8");
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const session = readFileSync(resolve(process.cwd(), "components/search/useCanonicalSearchSession.ts"), "utf8");

  assert.match(page, /<SearchPriceExplorerDock\s*\/>/);
  assert.match(dock, /CANONICAL_SEARCH_SESSION_EVENT/);
  assert.match(dock, /params\.get\("city"\)/);
  assert.match(dock, /params\.get\("district"\)/);
  assert.match(dock, /params\.get\("property_type"\)/);
  assert.match(dock, /params\.get\("transaction_type"\)/);
  assert.match(session, /history\.replaceState/);
  assert.match(session, /dispatchEvent\(new Event\(CANONICAL_SEARCH_SESSION_EVENT\)\)/);
});

test("price explorer synchronization does not create a second fetch or eligibility pipeline", () => {
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "app/search/page.tsx"), "utf8");

  assert.ok(!dock.includes("fetch("));
  assert.ok(!dock.includes("searchListings("));
  assert.ok(!page.includes("getPriceExplorerResult("));
});

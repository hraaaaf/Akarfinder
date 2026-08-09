import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("split hides secondary map cards at every viewport while map mode keeps them mounted", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.equal((shell.match(/data-search-map-secondary=/g) ?? []).length, 2);
  assert.equal((shell.match(/view === "split" \? "hidden" : ""/g) ?? []).length, 2);
  assert.match(shell, /Mon Projet AkarFinder/);
  assert.match(shell, /Ouvrir la carte complète/);
});

test("post-results intelligence fails closed when every model is unavailable", () => {
  const dock = source("components/search/SearchPriceExplorerDock.tsx");
  assert.match(dock, /const hasUsefulContent =/);
  assert.match(dock, /context\.priceReference\.status === "available"/);
  assert.match(dock, /context\.neighborhoodIntelligence\.status === "available"/);
  assert.match(dock, /context\.heatmap\.status === "available"/);
  assert.match(dock, /context\.similarNeighborhoods\.status === "available"/);
  assert.match(dock, /if \(!hasUsefulContent\) return null;/);
});

test("map neighborhood intelligence also fails closed when no useful model exists", () => {
  const dock = source("components/search/SearchMapNeighborhoodDock.tsx");
  assert.match(dock, /const hasUsefulNeighborhoodContent =/);
  assert.match(dock, /context\.explorer\.status === "available"/);
  assert.match(dock, /context\.heatmap\.status === "available"/);
  assert.match(dock, /context\.geometryCanaryRequested/);
  assert.match(dock, /if \(!hasUsefulNeighborhoodContent\) return null;/);
});

test("cleanup preserves useful intelligence and does not alter search decisions", () => {
  const page = source("app/search/page.tsx");
  const dock = source("components/search/SearchPriceExplorerDock.tsx");
  const mapDock = source("components/search/SearchMapNeighborhoodDock.tsx");
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.match(page, /<SearchPriceExplorerDock \/>/);
  assert.match(dock, /<PriceExplorerPanel result=\{context\.priceReference\} \/>/);
  assert.match(dock, /<NeighborhoodIntelligencePanel model=\{context\.neighborhoodIntelligence\} \/>/);
  assert.match(dock, /<CertifiedNeighborhoodComparisonPanel/);
  assert.match(dock, /<CertifiedSimilarNeighborhoodsPanel/);
  assert.match(mapDock, /<CityNeighborhoodExplorerPanel model=\{context\.explorer\} \/>/);
  assert.match(mapDock, /<CertifiedLocalHeatmapPanel model=\{context\.heatmap\} \/>/);
  assert.equal((shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length, 1);
  assert.doesNotMatch(`${dock}\n${mapDock}`, /commercial priority|display eligibility|source_policy/i);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1A.5 — Territorial Explorer", () => {
  it("builds the hierarchy only from canonical geo and map registries", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("resolveCityEntity"));
    assert.ok(explorer.includes("getNeighborhoodCities"));
    assert.ok(explorer.includes("getNeighborhoodsByCity"));
    assert.ok(explorer.includes("withMapLocation"));
  });

  it("exposes a progressive Morocco to city to district hierarchy", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes('aria-label="Exploration territoriale"'));
    assert.ok(explorer.includes('selectedCity ? "Quartiers" : "Villes"'));
    assert.ok(explorer.includes("Maroc"));
    assert.ok(explorer.includes("ChevronRight"));
  });

  it("replaces the city rail with districts after city selection", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("selectedCity\n              ? districts.map"));
    assert.ok(explorer.includes(": cityEntries.map"));
  });

  it("keeps territorial state inside the certified URL navigation contract", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    const client = source("components/map/MapNeighborhoodClient.tsx");
    assert.ok(explorer.includes("onNavigationChange(withMapLocation"));
    assert.ok(client.includes("buildMapHref(nextState)"));
    assert.ok(client.includes("mapNavigationStateFromUrlSearchParams"));
    assert.ok(client.includes("<TerritorialExplorer"));
  });

  it("does not introduce hard-coded geometry into the territorial controls", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.equal(/\blat(?:itude)?\b\s*[:=]/i.test(explorer), false);
    assert.equal(/\blon(?:gitude)?\b\s*[:=]/i.test(explorer), false);
    assert.equal(/\bcoordinates\b\s*[:=]/i.test(explorer), false);
    assert.equal(explorer.includes("new maplibregl"), false);
  });

  it("keeps the map canvas primary and the explorer floating", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    const client = source("components/map/MapNeighborhoodClient.tsx");
    assert.ok(explorer.includes("absolute left-3 right-3 top-[92px]"));
    assert.ok(explorer.includes("bg-card/94"));
    assert.ok(explorer.includes("backdrop-blur-xl"));
    assert.ok(client.indexOf("<MapNeighborhoodExperienceDynamic") < client.indexOf("<TerritorialExplorer"));
  });

  it("reserves tablet space for the district decision panel when a district is selected", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("md:w-[calc(100vw-438px)]"));
    assert.ok(explorer.includes("md:max-w-[720px]"));
  });

  it("adds the native Pro Max audit viewport to the final UI smoke", () => {
    const smoke = source("scripts/audits/final-ui-a11y-smoke.ts");
    assert.ok(smoke.includes('{ width: 430, height: 932, label: "430" }'));
  });
});

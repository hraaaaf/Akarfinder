import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1B.1 — AkarFinder Map Visual Layer", () => {
  it("defines a proprietary territorial layer namespace", () => {
    const visual = source("lib/map/akarfinder-territorial-style.ts");
    assert.ok(visual.includes('"akarfinder-neighborhood-fill"'));
    assert.ok(visual.includes('"akarfinder-neighborhood-outline"'));
    assert.ok(visual.includes('"akarfinder-neighborhood-label"'));
  });

  it("uses only canonical Casablanca geometry ids already present in the shadow registry", () => {
    const visual = source("lib/map/akarfinder-territorial-style.ts");
    const shadow = source("lib/geo/casablanca-neighborhood-geometry-shadow.ts");
    for (const id of [
      "anfa", "maarif", "sidi-belyout", "hay-hassani", "ain-chock", "al-fida",
      "mers-sultan", "ain-sebaa", "hay-mohammadi", "roches-noires", "sidi-bernoussi",
      "sidi-moumen", "moulay-rachid", "sidi-othmane", "ben-msick", "sbata",
    ]) {
      assert.ok(visual.includes(`\"${id}\"`));
      assert.ok(shadow.includes(`\"${id}\"`));
    }
  });

  it("keeps territorial colors explicitly non-semantic", () => {
    const visual = source("lib/map/akarfinder-territorial-style.ts");
    assert.ok(visual.includes("territorialColorsAreSemanticScores(): false"));
  });

  it("keeps production geometry protected by the existing canary", () => {
    const canary = source("lib/geo/casablanca-geometry-canary.ts");
    const route = source("app/api/geo/casablanca-arrondissements/route.ts");
    assert.ok(canary.includes('deploymentEnvironment === "production"'));
    assert.ok(canary.includes('reason: "production_blocked"'));
    assert.ok(route.includes("decideCasablancaGeometryCanary"));
    assert.ok(route.includes('status: "disabled"'));
  });

  it("mutes the generic basemap instead of pretending it is AkarFinder data", () => {
    const visual = source("lib/map/akarfinder-territorial-style.ts");
    assert.ok(visual.includes("applyAkarFinderBasemapTreatment"));
  });

  it("wires the visual layer into the real map through the protected canary endpoint", () => {
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(map.includes('CASABLANCA_TERRITORIAL_ENDPOINT = "/api/geo/casablanca-arrondissements"'));
    assert.ok(map.includes("applyAkarFinderBasemapTreatment"));
    assert.ok(map.includes("addAkarFinderTerritorialLayers"));
    assert.ok(map.includes('cityEntity?.slug !== "casablanca"'));
    assert.ok(map.includes('data-akarfinder-territorial-layer={territorialLayerActive ? "active" : "inactive"}'));
    assert.ok(map.includes("Couleurs AkarFinder = repérage territorial, pas un score de prix"));
  });

  it("reinstalls the territorial layer after every completed MapLibre style reload", () => {
    const map = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(map.includes("const [styleRevision, setStyleRevision] = useState(0)"));
    assert.ok(map.includes("setStyleRevision((revision) => revision + 1)"));
    assert.ok(map.includes("styleRevision === 0"));
    assert.ok(map.includes("[cityEntity?.slug, mapLoaded, styleRevision, theme]"));
    assert.ok(map.includes("map.isStyleLoaded()"));
  });
});

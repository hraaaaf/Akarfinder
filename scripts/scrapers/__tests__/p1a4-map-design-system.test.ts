import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  getMapConfidenceMeta,
  MAP_VISUAL_TOKENS,
} from "@/lib/map/map-design-system";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1A.4 — Map Design System", () => {
  it("uses the canonical AkarFinder blue for selection and actions", () => {
    assert.equal(MAP_VISUAL_TOKENS.accent, "#0B63CE");
    assert.equal(MAP_VISUAL_TOKENS.accentHover, "#084FA8");
    assert.equal(MAP_VISUAL_TOKENS.accentSoft, "#EEF6FF");
  });

  it("keeps confidence semantics explicit instead of color-only", () => {
    assert.equal(getMapConfidenceMeta("high").label, "Confiance élevée");
    assert.equal(getMapConfidenceMeta("medium").label, "Confiance moyenne");
    assert.equal(getMapConfidenceMeta("low").label, "Confiance limitée");
  });

  it("removes the historical brown map chrome", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    for (const legacy of ["#9B7838", "#C2A368", "#b08c44", "#d9c8a7", "#fffaf0", "#765823"]) {
      assert.equal(experience.includes(legacy), false, `legacy map color remains: ${legacy}`);
    }
    assert.equal(experience.includes("bronze-"), false);
  });

  it("separates selection, confidence, and neutral marker borders", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(experience.includes("MAP_VISUAL_TOKENS.accent"));
    assert.ok(experience.includes("MAP_VISUAL_TOKENS.border"));
    assert.ok(experience.includes("getMapConfidenceMeta"));
    assert.ok(experience.includes("confidence.label"));
    assert.ok(experience.includes("aria-pressed"));
  });

  it("uses a floating decision panel without shrinking the map viewport", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(experience.includes("absolute inset-x-3 bottom-3"));
    assert.ok(experience.includes("md:right-4 md:top-[92px] md:w-[390px]"));
    assert.ok(experience.includes("max-h-[48vh] overflow-y-auto"));
    assert.ok(experience.includes("Rechercher dans ce quartier"));
    assert.ok(experience.includes("Voir la page quartier"));
  });

  it("keeps a light floating cockpit over a map-first canvas", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(experience.includes('aria-label="Contrôles de la carte immobilière"'));
    assert.ok(experience.includes("bg-card/95"));
    assert.ok(experience.includes("backdrop-blur-xl"));
    assert.equal(experience.includes("bg-deepblue text-white"), false);
    assert.equal(experience.includes("flex-shrink-0 border-b"), false);
  });

  it("keeps controls concise and accessible across viewports", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(experience.includes('aria-label="Réinitialiser la carte"'));
    assert.ok(experience.includes('className="sr-only">Ville'));
    assert.ok(experience.includes("sm:hidden\">Résultats"));
    assert.ok(experience.includes("Aucune limite de quartier n’est inventée"));
  });
});

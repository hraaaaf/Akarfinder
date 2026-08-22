import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const section = source("components/landing/SignatureMapSection.tsx");

describe("HVR-4 — actionable neighborhood intelligence", () => {
  it("uses the approved functional heading", () => {
    assert.ok(section.includes("Comprendre le quartier avant de visiter"));
    assert.ok(!section.includes("Un bien ne se résume pas à ses mètres carrés."));
  });

  it("keeps the three canonical featured neighborhoods", () => {
    for (const id of ["rabat-agdal", "casablanca-maarif", "marrakech-gueliz"]) {
      assert.ok(section.includes(id));
    }
  });

  it("turns every neighborhood card into a direct destination", () => {
    assert.ok(section.includes("data-home-neighborhood-card"));
    assert.ok(section.includes("href={neighborhoodHref(point)}"));
    assert.ok(!section.includes("useState"));
    assert.ok(!section.includes('role="tab"'));
  });

  it("removes passive future-state UI", () => {
    for (const forbidden of ["bientôt disponible", "FUTURE_DIMENSIONS", "Star", "aperçu non interactif"]) {
      assert.ok(!section.includes(forbidden), `passive UI still present: ${forbidden}`);
    }
  });

  it("caps information density per card", () => {
    assert.ok(section.includes("proximityHighlights.slice(0, 2)"));
    assert.ok(section.includes("lifestyleTags.slice(0, 3)"));
    assert.ok(section.includes("point.priceSignal.label"));
  });
});

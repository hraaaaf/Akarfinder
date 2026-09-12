import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const page = source("app/page.tsx");
const grid = source("components/home/HomeActionGrid.tsx");

describe("HVR-5 — HOME V1 simplification", () => {
  it("keeps one compact final action grid", () => {
    assert.ok(page.includes("<HomeActionGrid />"));
    assert.ok(!page.includes("<HowItWorks />"));
    assert.ok(!page.includes("<MreTrustSection />"));
    assert.ok(!page.includes("<HomeFinalCTA />"));
  });

  it("keeps actions after Vivre ici and compact cities", () => {
    const neighborhood = page.indexOf("<HomeVivreIciSection />");
    const cities = page.indexOf("<CityIntentGrid />");
    const actions = page.indexOf("<HomeActionGrid />");
    const footer = page.indexOf("<SiteFooter />");
    assert.ok(neighborhood >= 0 && cities > neighborhood && actions > cities && footer > actions);
  });

  it("provides exactly three approved direct destinations", () => {
    for (const href of ["/mon-projet", "/vendre", "/pro"]) assert.ok(grid.includes(`href: "${href}"`));
    for (const forbidden of ["/search", "/compagnon"]) assert.ok(!grid.includes(`href: "${forbidden}"`));
    assert.ok(grid.includes('data-home-action-count="3"'));
    assert.ok(grid.includes("actions.map"));
  });

  it("removes misleading example values from the mounted homepage funnel", () => {
    for (const forbidden of ["4 000 000 DH", "Biens enregistrés", ">8<", "Étape 1", "Étape 2", "Étape 3"]) {
      assert.ok(!page.includes(forbidden));
      assert.ok(!grid.includes(forbidden));
    }
  });

  it("keeps the replacement truth-safe and action-oriented", () => {
    assert.ok(grid.includes("La suite de votre projet"));
    assert.ok(grid.includes("Préparer mon projet"));
    assert.ok(grid.includes("Vendre / Estimer"));
    assert.ok(grid.includes("Agences & promoteurs"));
    assert.ok(!grid.includes("Rechercher un bien"));
  });
});

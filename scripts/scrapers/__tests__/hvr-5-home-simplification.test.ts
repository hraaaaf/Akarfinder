import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const page = source("app/page.tsx");
const grid = source("components/home/HomeActionGrid.tsx");

describe("HVR-5 — homepage simplification", () => {
  it("replaces the three verbose lower-homepage sections with one action grid", () => {
    assert.ok(page.includes("<HomeActionGrid />"));
    assert.ok(!page.includes("<HowItWorks />"));
    assert.ok(!page.includes("<MreTrustSection />"));
    assert.ok(!page.includes("<HomeFinalCTA />"));
  });

  it("keeps the action grid after neighborhood intelligence", () => {
    const neighborhood = page.indexOf("<SignatureMapSection />");
    const actions = page.indexOf("<HomeActionGrid />");
    const footer = page.indexOf("<SiteFooter />");
    assert.ok(neighborhood >= 0 && actions > neighborhood && footer > actions);
  });

  it("provides exactly four direct action destinations", () => {
    for (const href of ["/search", "/compagnon", "/vendre", "/pro"]) {
      assert.ok(grid.includes(`href: "${href}"`), `missing action destination ${href}`);
    }
    assert.equal((grid.match(/data-hvr5-action=/g) ?? []).length, 1);
    assert.ok(grid.includes("actions.map"));
  });

  it("removes misleading example values from the mounted homepage funnel", () => {
    for (const forbidden of ["4 000 000 DH", "Biens enregistrés", ">8<", "Étape 1", "Étape 2", "Étape 3"]) {
      assert.ok(!page.includes(forbidden));
      assert.ok(!grid.includes(forbidden));
    }
  });

  it("keeps the replacement truth-safe and action-oriented", () => {
    assert.ok(grid.includes("Que voulez-vous faire maintenant ?"));
    assert.ok(grid.includes("Rechercher un bien"));
    assert.ok(grid.includes("Préparer mon projet"));
    assert.ok(grid.includes("Préparer ma vente"));
    assert.ok(grid.includes("Agences & promoteurs"));
  });
});

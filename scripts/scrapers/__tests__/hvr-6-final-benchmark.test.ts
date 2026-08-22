import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("HVR-6 final homepage benchmark contracts", () => {
  it("keeps the final search-first action sequence without the passive value strip", () => {
    const page = source("app/page.tsx");
    assert.ok(page.includes("<GoogleLikeHero />"));
    assert.ok(page.includes("<CityIntentGrid />"));
    assert.ok(page.includes("<HomeListingsSection />"));
    assert.ok(page.includes("<SignatureMapSection />"));
    assert.ok(page.includes("<HomeActionGrid />"));
    assert.ok(!page.includes("HomeValueStrip"));

    const order = [
      "<GoogleLikeHero />",
      "<CityIntentGrid />",
      "<HomeListingsSection />",
      "<SignatureMapSection />",
      "<HomeActionGrid />",
      "<SiteFooter />",
    ].map((token) => page.indexOf(token));
    assert.ok(order.every((value) => value >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
  });

  it("keeps four direct secondary actions and removes internal benchmark copy", () => {
    const grid = source("components/home/HomeActionGrid.tsx");
    for (const href of ["/search", "/compagnon", "/vendre", "/pro"]) {
      assert.ok(grid.includes(`href: "${href}"`));
    }
    assert.ok(grid.includes("Que voulez-vous faire maintenant ?"));
    assert.ok(!grid.includes("Pas de détour"));
    assert.ok(!grid.includes("chiffres d’exemple"));
  });

  it("documents the four fresh benchmark references before final correction", () => {
    const benchmark = source("docs/HVR_6_FINAL_BENCHMARK.md");
    for (const host of ["rightmove.co.uk", "zillow.com", "redfin.com", "realtor.com"]) {
      assert.ok(benchmark.includes(host));
    }
    assert.ok(benchmark.includes("HomeValueStrip"));
    assert.ok(benchmark.includes("Goal visuel / wireframe avant implémentation"));
  });
});

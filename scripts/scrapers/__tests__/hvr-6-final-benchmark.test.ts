import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("HVR-6 final HOME V1 benchmark contracts", () => {
  it("keeps the final search-first sequence without generic listings", () => {
    const page = source("app/page.tsx");
    const order = [
      "<GoogleLikeHero />",
      "<HomeTrustStrip />",
      "<HomeVivreIciSection />",
      "<CityIntentGrid />",
      "<HomeActionGrid />",
      "<SiteFooter />",
    ].map((token) => page.indexOf(token));
    assert.ok(order.every((value) => value >= 0));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.ok(!page.includes("HomeListingsSection"));
    assert.ok(!page.includes("HomeValueStrip"));
  });

  it("keeps the three approved secondary actions and removes legacy routes", () => {
    const grid = source("components/home/HomeActionGrid.tsx");
    for (const href of ["/mon-projet", "/vendre", "/pro"]) assert.ok(grid.includes(`href: "${href}"`));
    for (const forbidden of ["/search", "/compagnon"]) assert.ok(!grid.includes(`href: "${forbidden}"`));
    assert.ok(grid.includes("La suite de votre projet"));
    assert.ok(!grid.includes("Pas de détour"));
    assert.ok(!grid.includes("chiffres d’exemple"));
  });

  it("retains the historical benchmark document as evidence, not authority", () => {
    const benchmark = source("docs/HVR_6_FINAL_BENCHMARK.md");
    for (const host of ["rightmove.co.uk", "zillow.com", "redfin.com", "realtor.com"]) assert.ok(benchmark.includes(host));
    assert.ok(benchmark.includes("Goal visuel / wireframe avant implémentation"));
  });
});

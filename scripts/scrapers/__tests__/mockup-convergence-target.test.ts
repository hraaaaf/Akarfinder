import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const target = read("docs/MOCKUP_CONVERGENCE_TARGET.md");
const designSystem = read("components/ui/design-system.ts");

const keyRoutes = [
  "app/search/page.tsx",
  "app/favorites/page.tsx",
  "app/map/page.tsx",
  "app/alerts/page.tsx",
  "app/compare/page.tsx",
  "app/mon-projet/page.tsx",
];

describe("Mockup convergence target contracts", () => {
  it("keeps the current product as functional truth and the mockup as composition reference", () => {
    assert.match(target, /functional and data source of truth/);
    assert.match(target, /composition, density and premium-perception reference/);
    assert.match(target, /hybrid target\*\*, not a pixel-copy program/);
  });

  it("governs all six key product routes", () => {
    for (const route of keyRoutes) {
      assert.equal(existsSync(route), true, `Missing governed route: ${route}`);
    }
    for (const label of ["Search", "Favorites", "Map", "Alerts", "Compare", "Mon projet"]) {
      assert.match(target, new RegExp(`\\| ${label} \\|`));
    }
  });

  it("preserves one shared visual system instead of creating a mockup-only fork", () => {
    assert.match(target, /reuse `components\/ui\/design-system\.ts`/);
    assert.match(target, /second parallel design system/);
    assert.match(designSystem, /surfacePremium/);
    assert.match(designSystem, /primaryActionPill/);
    assert.match(designSystem, /chipActive/);
  });

  it("locks truth-safe populated states and forbids fabricated polish", () => {
    assert.match(target, /Populated state first, empty state truthful/);
    assert.match(target, /fabricated listings, alerts, activity, project progress, lead counts or partner states/);
    assert.match(target, /Truth before beauty/);
  });

  it("pins the certified pre-convergence baseline", () => {
    assert.match(target, /31891405842/);
    assert.match(target, /9248716663/);
    assert.match(target, /5b9223953cbfab597923601be2e88b49f1c1589ad662aa6e2da3fbeeb2cb4a3c/);
    for (const route of ["search", "favorites", "map", "alerts", "compare", "mon-projet"]) {
      assert.match(target, new RegExp(`\\b${route}\\b`, "i"));
    }
  });

  it("defines the six-lot execution sequence and exact L1 close condition", () => {
    for (let lot = 1; lot <= 6; lot += 1) {
      assert.match(target, new RegExp(`### L${lot} —`));
    }
    assert.match(target, /L1 can close when this target document and its machine-readable source contract are merged after exact-head CI/);
    assert.match(target, /No runtime UI change is required in L1/);
  });
});

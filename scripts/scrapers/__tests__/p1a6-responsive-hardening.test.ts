import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1A.6 — Responsive hardening", () => {
  it("keeps the certified responsive viewport matrix including Pro Max", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    for (const expected of [
      '{ width: 390, height: 844, label: "390" }',
      '{ width: 430, height: 932, label: "430" }',
      '{ width: 768, height: 1024, label: "768" }',
      '{ width: 1280, height: 900, label: "1280" }',
    ]) assert.ok(audit.includes(expected));
  });

  it("audits Morocco, city and selected district states", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes('{ path: "/map", slug: "map" }'));
    assert.ok(audit.includes('/map?city=Rabat'));
    assert.ok(audit.includes('/map?city=Rabat&district=Agdal'));
  });

  it("certifies real viewport composition rather than full-page screenshots", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes("fullPage: false"));
    assert.ok(audit.includes("cockpit-explorer-overlap"));
    assert.ok(audit.includes("explorer-panel-overlap"));
    assert.ok(audit.includes("territorial-touch-target"));
    assert.equal(audit.includes('keyboard.press("Tab")'), false);
  });

  it("hardens territorial controls for touch and keyboard without changing geo navigation", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("h-10 shrink-0"));
    assert.ok(explorer.includes("focus-visible:ring-2"));
    assert.ok(explorer.includes("overscroll-x-contain"));
    assert.ok(explorer.includes("withMapLocation"));
    assert.ok(explorer.includes("resolveCityEntity"));
  });

  it("separates the explorer from the taller mobile and tablet cockpit", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("top-[112px]"));
    assert.ok(explorer.includes("sm:top-[128px]"));
    assert.ok(explorer.includes("lg:top-[96px]"));
  });

  it("preserves the selected-district tablet collision guard from P1A.5", () => {
    const explorer = source("components/map/TerritorialExplorer.tsx");
    assert.ok(explorer.includes("md:w-[calc(100vw-438px)]"));
    assert.ok(explorer.includes("md:max-w-[720px]"));
  });
});

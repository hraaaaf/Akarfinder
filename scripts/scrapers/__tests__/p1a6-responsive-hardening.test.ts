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

  it("audits Morocco, city and selected district states across national and intelligence experiences", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes('{ path: "/map", slug: "map", experience: "national" }'));
    assert.ok(audit.includes('{ path: "/map?city=Rabat", slug: "map-rabat", experience: "intelligence" }'));
    assert.ok(audit.includes('{ path: "/map?city=Rabat&district=Agdal", slug: "map-rabat-agdal", experience: "intelligence" }'));
    assert.ok(audit.includes('/api/geo/national-territories'));
    assert.ok(audit.includes('[data-akarfinder-market-intelligence-map]'));
  });

  it("certifies real viewport composition rather than full-page screenshots", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes("fullPage: false"));
    assert.ok(audit.includes("horizontal-overflow"));
    assert.ok(audit.includes("MapLibre canvas missing"));
    assert.equal(audit.includes('keyboard.press("Tab")'), false);
  });

  it("uses the current national router for generic explore mode", () => {
    const router = source("components/map/NationalMapRouter.tsx");
    const national = source("components/map/NationalTerritoryExperience.tsx");
    assert.match(router, /NationalTerritoryExperienceDynamic/);
    assert.match(router, /useNationalExplore/);
    assert.match(national, /\/api\/geo\/national-territories/);
    assert.match(national, /__AKARFINDER_NATIONAL_MAP__/);
  });

  it("preserves Rabat market intelligence for city and district states", () => {
    const router = source("components/map/NationalMapRouter.tsx");
    assert.match(router, /rabat-market-intelligence/);
    assert.match(router, /MapNeighborhoodClient/);
  });
});

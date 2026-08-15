import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const searchPage = read("app/search/page.tsx");
const searchCss = read("app/search/mockup-convergence-l2.css");
const mapPage = read("app/map/page.tsx");
const mapCss = read("app/map/mockup-convergence-l2.css");

describe("Mockup convergence L2 Search + Map contracts", () => {
  it("loads presentation-only convergence layers on Search and Map", () => {
    assert.match(searchPage, /mockup-convergence-l2\.css/);
    assert.match(mapPage, /mockup-convergence-l2\.css/);
  });

  it("keeps Search convergence scoped to existing UI data contracts", () => {
    assert.match(searchCss, /data-search-results-section/);
    assert.match(searchCss, /data-search-results-toolbar/);
    assert.match(searchCss, /data-search-continuous-flow/);
    assert.doesNotMatch(searchCss, /ranking|registry|entitlement|supabase|fetch\(/i);
  });

  it("keeps Map convergence scoped to presentation and canonical selected-state hooks", () => {
    assert.match(mapCss, /Fiche repère quartier/);
    assert.match(mapCss, /maplibre-neighborhood-marker/);
    assert.match(mapCss, /maplibre-cluster-marker/);
    assert.doesNotMatch(mapCss, /latitude|longitude|benchmark|registry|fetch\(/i);
  });

  it("retains accessible compact controls and mobile selected sheet", () => {
    assert.match(searchCss, /min-height: 44px/);
    assert.match(mapCss, /max-height: 43vh/);
    assert.match(mapCss, /border-radius: 22px/);
  });

  it("keeps the secondary footer out of the primary mobile Search and Map viewport", () => {
    assert.match(searchPage, /className="l2-secondary-footer"/);
    assert.match(mapPage, /className="l2-secondary-footer"/);
    assert.match(searchCss, /\.l2-secondary-footer\s*\{\s*display: none;/s);
    assert.match(mapCss, /\.l2-secondary-footer\s*\{\s*display: none;/s);
  });
});

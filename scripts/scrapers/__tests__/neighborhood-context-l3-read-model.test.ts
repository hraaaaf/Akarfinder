import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET } from "@/app/api/geo/neighborhood-context/route";
import {
  buildNeighborhoodContextRuntimeCatalog,
  getNeighborhoodContextReadModelBySlugs,
  validateNeighborhoodContextReadModel,
} from "@/lib/neighborhood-context/read-model";

const NOW = new Date("2026-08-24T20:50:00.000Z");

describe("Neighborhood Context L3 — read model", () => {
  it("builds one deterministic read model for each pilot", () => {
    const first = buildNeighborhoodContextRuntimeCatalog(NOW);
    const second = buildNeighborhoodContextRuntimeCatalog(NOW);
    assert.equal(first.length, 6);
    assert.deepEqual(second, first);
    for (const model of first) assert.deepEqual(validateNeighborhoodContextReadModel(model), []);
  });

  it("preserves the expected pilot coverage without fabricating missing context", () => {
    const catalog = buildNeighborhoodContextRuntimeCatalog(NOW);
    const byId = new Map(catalog.map((entry) => [entry.canonical_neighborhood_id, entry]));
    assert.equal(byId.get("district_rabat_agdal")?.coverage_status, "covered");
    assert.equal(byId.get("district_casablanca_maarif")?.coverage_status, "insufficient");
    assert.equal(byId.get("district_marrakech_gueliz")?.coverage_status, "insufficient");
    assert.equal(byId.get("district_tanger_malabata")?.coverage_status, "partial");
    assert.equal(byId.get("district_agadir_founty")?.coverage_status, "unavailable");
    assert.equal(byId.get("district_fes_ville_nouvelle")?.coverage_status, "unavailable");
  });

  it("keeps canonical POI identity and complete provenance", () => {
    const agdal = getNeighborhoodContextReadModelBySlugs("rabat", "agdal", NOW);
    assert.ok(agdal);
    assert.equal(agdal.anchor_count, 5);
    assert.equal(agdal.anchors.every((anchor) => anchor.poi_id.startsWith("osm:")), true);
    assert.equal(agdal.anchors.every((anchor) => anchor.source_id === "openstreetmap"), true);
    assert.equal(agdal.anchors.every((anchor) => anchor.freshness_status === "fresh"), true);
    assert.equal(agdal.anchors.every((anchor) => Boolean(anchor.attribution && anchor.observed_at)), true);
    assert.equal(agdal.anchors.some((anchor) => anchor.territorial_wording === "Dans le quartier"), false);
  });

  it("fails freshness closed once the certified runtime seed expires", () => {
    const future = new Date("2026-10-01T00:00:00.000Z");
    const catalog = buildNeighborhoodContextRuntimeCatalog(future);
    assert.equal(catalog.every((entry) => entry.anchor_count === 0), true);
    assert.equal(catalog.every((entry) => entry.coverage_status === "unavailable"), true);
  });
});

describe("Neighborhood Context L3 — API", () => {
  it("returns 400 when city or district is missing", async () => {
    const response = await GET(new Request("http://localhost/api/geo/neighborhood-context?city=rabat"));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  it("returns 404 for an unknown district without guessing", async () => {
    const response = await GET(new Request("http://localhost/api/geo/neighborhood-context?city=rabat&district=unknown"));
    assert.equal(response.status, 404);
  });

  it("returns a bounded truth-safe read model for Rabat/Agdal", async () => {
    const response = await GET(new Request("http://localhost/api/geo/neighborhood-context?city=rabat&district=agdal"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    assert.equal(response.headers.get("x-akarfinder-context-source"), "ann-l5-certified-seed");
    const body = await response.json() as { status: string; context: { canonical_neighborhood_id: string; anchor_count: number } };
    assert.equal(body.status, "ok");
    assert.equal(body.context.canonical_neighborhood_id, "district_rabat_agdal");
    assert.equal(body.context.anchor_count, 5);
  });
});

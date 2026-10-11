import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET } from "@/app/api/geo/neighborhood-context/route";
import {
  buildNeighborhoodContextRuntimeCatalog,
  getNeighborhoodContextReadModelBySlugs,
  validateNeighborhoodContextReadModel,
} from "@/lib/neighborhood-context/read-model";

const NOW = new Date("2026-08-24T20:50:00.000Z");
const MAARIF_COUCHE2_NOW = new Date("2026-09-24T12:00:00.000Z");

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
    assert.equal(byId.get("district_rabat_agdal")?.coverage_status, "partial");
    assert.equal(byId.get("district_casablanca_maarif")?.coverage_status, "insufficient");
    assert.equal(byId.get("district_marrakech_gueliz")?.coverage_status, "insufficient");
    assert.equal(byId.get("district_tanger_malabata")?.coverage_status, "partial");
    assert.equal(byId.get("district_agadir_founty")?.coverage_status, "unavailable");
    assert.equal(byId.get("district_fes_ville_nouvelle")?.coverage_status, "unavailable");
  });

  it("uses the fresh Maârif Couche 2 source without claiming inside-neighborhood truth", () => {
    const maarif = getNeighborhoodContextReadModelBySlugs("casablanca", "maarif", MAARIF_COUCHE2_NOW);
    assert.ok(maarif);
    assert.equal(maarif.source.mode, "maarif-couche2-osm-refresh");
    assert.equal(maarif.source.provider_id, "landmark-factory-casablanca-20260920");
    assert.equal(maarif.source.certified_run_id, 35523711412);
    assert.equal(maarif.coverage_status, "partial");
    assert.equal(maarif.anchor_count, 4);
    assert.deepEqual(
      maarif.categories,
      ["education", "green_sport", "groceries", "health"],
    );
    assert.deepEqual(
      maarif.anchors.map((anchor) => anchor.name),
      [
        "Université Mundiapolis",
        "Marché Central du Maârif",
        "Clinique Badr مصحة بدر",
        "Parc du Vélodrome",
      ],
    );
    assert.equal(maarif.anchors.every((item) => item.relation === "near_certified_reference"), true);
    assert.equal(maarif.anchors.every((item) => item.territorial_wording === "Autour du repère quartier"), true);
    assert.equal(maarif.anchors.some((item) => item.territorial_wording === "Dans le quartier"), false);
    assert.deepEqual(validateNeighborhoodContextReadModel(maarif), []);
  });

  it("keeps canonical POI identity and complete provenance", () => {
    const agdal = getNeighborhoodContextReadModelBySlugs("rabat", "agdal", NOW);
    assert.ok(agdal);
    assert.equal(agdal.anchor_count, 4);
    assert.equal(agdal.anchors.every((anchor) => anchor.poi_id.startsWith("osm:")), true);
    assert.equal(agdal.anchors.every((anchor) => anchor.source_id === "openstreetmap"), true);
    assert.equal(agdal.anchors.every((anchor) => anchor.freshness_status === "fresh"), true);
    assert.equal(agdal.anchors.every((anchor) => Boolean(anchor.attribution && anchor.observed_at)), true);
    assert.equal(agdal.anchors.some((anchor) => anchor.territorial_wording === "Dans le quartier"), false);
  });

  it("fails freshness closed once the certified runtime seed expires", () => {
    const future = new Date("2026-11-01T00:00:00.000Z");
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

  it("fails current Rabat/Agdal context closed after ANN-L5 freshness expiry", async () => {
    const response = await GET(new Request("http://localhost/api/geo/neighborhood-context?city=rabat&district=agdal"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    assert.equal(response.headers.get("x-akarfinder-context-source"), "ann-l5-certified-seed");
    const body = await response.json() as {
      status: string;
      context: { canonical_neighborhood_id: string; anchor_count: number; coverage_status: string };
    };
    assert.equal(body.status, "ok");
    assert.equal(body.context.canonical_neighborhood_id, "district_rabat_agdal");
    assert.equal(body.context.anchor_count, 0);
    assert.equal(body.context.coverage_status, "unavailable");
  });

  it("returns the current fresh Maârif Couche 2 context with its real source header", async () => {
    const response = await GET(new Request("http://localhost/api/geo/neighborhood-context?city=casablanca&district=maarif"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    assert.equal(response.headers.get("x-akarfinder-context-source"), "maarif-couche2-osm-refresh");
    const body = await response.json() as {
      status: string;
      context: {
        canonical_neighborhood_id: string;
        anchor_count: number;
        coverage_status: string;
        source: { mode: string; certified_run_id: number };
        anchors: Array<{ territorial_wording: string }>;
      };
    };
    assert.equal(body.status, "ok");
    assert.equal(body.context.canonical_neighborhood_id, "district_casablanca_maarif");
    assert.equal(body.context.anchor_count, 4);
    assert.equal(body.context.coverage_status, "partial");
    assert.equal(body.context.source.mode, "maarif-couche2-osm-refresh");
    assert.equal(body.context.source.certified_run_id, 35523711412);
    assert.equal(body.context.anchors.every((anchor) => anchor.territorial_wording === "Autour du repère quartier"), true);
  });
});

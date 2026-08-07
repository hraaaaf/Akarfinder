import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMapHref,
  buildMapSearchHref,
  buildNeighborhoodPageHref,
  parseMapNavigationState,
  withMapLocation,
} from "@/lib/map/map-navigation-state";

describe("P1A.3 — map state and navigation", () => {
  it("canonicalizes city and district aliases into shareable slugs", () => {
    const state = parseMapNavigationState({
      city: "Rabat",
      district: "Hay Ryad",
      layer: "anything",
      q: "terrasse",
      property_type: "Appartement",
      project_id: "project-42",
    });

    assert.deepEqual(state, {
      city: "rabat",
      district: "hay-riad",
      layer: "explore",
      q: "terrasse",
      property_type: "Appartement",
      project_id: "project-42",
    });
  });

  it("builds the locked structured map contract with independent free text", () => {
    const state = parseMapNavigationState({
      city: "Rabat",
      district: "Agdal",
      q: "terrasse",
      project_id: "project-42",
    });

    assert.equal(
      buildMapHref(state),
      "/map?city=rabat&district=agdal&layer=explore&q=terrasse&project_id=project-42",
    );
    assert.equal(
      buildMapSearchHref(state),
      "/search?city=Rabat&district=Agdal&q=terrasse&project_id=project-42",
    );
  });

  it("fails closed when a district does not belong to the requested city", () => {
    const state = parseMapNavigationState({ city: "Casablanca", district: "Souissi" });
    assert.equal(state.city, "casablanca");
    assert.equal(state.district, undefined);
    assert.equal(buildMapHref(state), "/map?city=casablanca&layer=explore");
  });

  it("preserves canonical Search filters and project continuity", () => {
    const state = parseMapNavigationState({
      city: "Marrakech",
      district: "Guéliz",
      transaction_type: "buy",
      min_price: "1000000",
      max_price: "2500000",
      min_surface: "80",
      bedrooms: "2",
      sort: "price_asc",
      view: "split",
      project_id: "p-1",
    });

    assert.match(buildMapHref(state), /transaction_type=buy/);
    assert.match(buildMapHref(state), /min_price=1000000/);
    assert.match(buildMapHref(state), /bedrooms=2/);
    assert.match(buildMapHref(state), /project_id=p-1/);
    assert.match(buildMapSearchHref(state), /district=Gu%C3%A9liz/);
  });

  it("only exposes a neighborhood page when the canonical geo pair is SEO eligible", () => {
    const agdal = parseMapNavigationState({
      city: "rabat",
      district: "agdal",
      project_id: "p-9",
    });
    assert.equal(
      buildNeighborhoodPageHref(agdal),
      "/immobilier/rabat/agdal?project_id=p-9",
    );

    const hassan = parseMapNavigationState({ city: "rabat", district: "hassan" });
    assert.equal(buildNeighborhoodPageHref(hassan), null);
  });

  it("changes geographic selection without discarding the rest of the journey", () => {
    const initial = parseMapNavigationState({
      city: "rabat",
      district: "agdal",
      q: "terrasse",
      project_id: "p-2",
    });
    const next = withMapLocation(initial, "Marrakech", "Guéliz");

    assert.equal(next.city, "marrakech");
    assert.equal(next.district, "gueliz");
    assert.equal(next.q, "terrasse");
    assert.equal(next.project_id, "p-2");
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { VERIFIED_LANDMARKS } from "../../../lib/geo/territory-landmark-registry";
import {
  LANDMARK_THEME_LABELS_FR,
  getLandmarkThemeTags,
} from "../../../lib/geo/territory-landmark-themes";

test("every verified landmark resolves to at least one editorial theme", () => {
  for (const { entity } of VERIFIED_LANDMARKS) {
    const themes = getLandmarkThemeTags(entity);
    assert.ok(themes.length >= 1, entity.id);
    assert.equal(new Set(themes).size, themes.length, entity.id);
    for (const theme of themes) assert.ok(LANDMARK_THEME_LABELS_FR[theme], theme);
  }
});

test("canonical examples map to the expected themes", () => {
  const byId = new Map(VERIFIED_LANDMARKS.map((entry) => [entry.entity.id, entry.entity]));

  assert.deepEqual(
    getLandmarkThemeTags(byId.get("landmark_casablanca_maarif_stade_mohammed_v")!),
    ["stadiums"],
  );
  assert.deepEqual(
    getLandmarkThemeTags(byId.get("landmark_rabat_agdal_station")!),
    ["stations-hubs"],
  );
  assert.deepEqual(
    getLandmarkThemeTags(byId.get("landmark_tanger_marchan_cafe_hafa")!),
    ["iconic-cafes"],
  );
  assert.deepEqual(
    getLandmarkThemeTags(byId.get("landmark_rabat_ocean_musee_national_photographie")!),
    ["museums-culture", "lighthouses-forts-ramparts"],
  );
});

test("technical category stays separate from editorial theme", () => {
  const stadium = VERIFIED_LANDMARKS.find(
    ({ entity }) => entity.id === "landmark_kenitra_centre_ville_stade_municipal",
  )!.entity;

  assert.equal(stadium.category, "sports");
  assert.deepEqual(getLandmarkThemeTags(stadium), ["stadiums"]);
});

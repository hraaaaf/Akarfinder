import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildPropertyPassportModel } from "../../../lib/ux/property-passport";

const baseListing = {
  id: "listing-passport",
  title: "Appartement test",
  city: "Casablanca",
  neighborhood: "Maarif",
  district: "Maarif",
  property_type: "apartment",
  transaction_type: "buy",
  price: 1800000,
  currency: "MAD",
  surface_m2: 95,
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  source_name: "Source test",
  source_access_level: "public_indexed",
  search_result_display_mode: "structured_internal",
  can_show_result: true,
  production_allowed: true,
  reliability_score: 0.82,
  reliability_available: true,
  data_completeness_score: 0.74,
  duplicate_group_id: "group-passport",
  latitude: 33.586,
  longitude: -7.632,
  geo_precision: "exact",
  geo_source: "scraped_coordinates",
} as any;

test("property passport exposes only available certified evidence", () => {
  const passport = buildPropertyPassportModel(baseListing);
  assert.equal(passport.identityLabel, "Propriété rapprochée");
  assert.equal(passport.geoLabel, "Coordonnées exactes certifiées");
  assert.ok(passport.qualityItems.some((item) => item.label === "Complétude des informations" && item.value === "74 %"));
  assert.ok(passport.qualityItems.some((item) => item.label === "Fiabilité disponible" && item.value === "82 %"));
});

test("uncertified geography remains declarative", () => {
  const passport = buildPropertyPassportModel({
    ...baseListing,
    duplicate_group_id: undefined,
    geo_precision: "city_centroid",
    geo_source: "city_centroid",
  });
  assert.equal(passport.identityLabel, "Représentation unique");
  assert.equal(passport.geoLabel, "Localisation déclarative");
});

test("passport names unavailable evidence instead of fabricating it", () => {
  const passport = buildPropertyPassportModel(baseListing);
  assert.deepEqual(passport.unavailableEvidence, [
    "Historique de prix certifié",
    "Chronologie multi-source certifiée",
    "Nombre total de représentations vérifiées",
  ]);
});

test("quick preview exposes one canonical property passport panel", () => {
  const preview = readFileSync(resolve(process.cwd(), "components/search/PropertyQuickPreview.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/PropertyPassportPanel.tsx"), "utf8");
  assert.match(preview, /Property Passport/);
  assert.match(preview, /<PropertyPassportPanel listing={activeListing}/);
  assert.match(panel, /Preuves non disponibles/);
  assert.ok(!panel.includes("historique simulé"));
  assert.ok(!panel.includes("sources détectées"));
});

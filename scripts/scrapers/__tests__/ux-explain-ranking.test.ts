import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildExplainRankingModel } from "../../../lib/ux/explain-ranking";

const listing = {
  id: "ranking-test",
  title: "Appartement test",
  city: "Casablanca",
  neighborhood: "Maarif",
  property_type: "Appartement",
  transaction_type: "buy",
  price: 1800000,
  currency: "DH",
  surface_m2: 95,
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  source_access_level: "partner_full",
  search_result_display_mode: "full_partner_listing",
  data_completeness_score: 74,
  reliability_score: 82,
  reliability_available: true,
  duplicate_group_id: "group-ranking",
  latitude: 33.586,
  longitude: -7.632,
  geo_precision: "exact",
  geo_source: "scraped_coordinates",
} as any;

test("ranking explanation exposes only evidence-backed public signals", () => {
  const model = buildExplainRankingModel(listing);
  const codes = model.signals.map((signal) => signal.code);
  assert.ok(codes.includes("information_completeness"));
  assert.ok(codes.includes("reliability_available"));
  assert.ok(codes.includes("freshness_available"));
  assert.ok(codes.includes("certified_coordinates"));
  assert.ok(codes.includes("partner_authorized"));
  assert.ok(codes.includes("canonical_property"));
});

test("unsupported ranking claims are never generated", () => {
  const model = buildExplainRankingModel({
    ...listing,
    source_access_level: "indexed_only",
    duplicate_group_id: undefined,
    reliability_available: false,
    data_completeness_score: undefined,
    freshness_label: "",
    geo_precision: "city_centroid",
    geo_source: "city_centroid",
  });
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("bonne affaire"));
  assert.ok(!text.includes("très demandé"));
  assert.ok(!text.includes("coup de cœur"));
  assert.ok(!text.includes("poids"));
  assert.ok(!text.includes("pondération exacte"));
});

test("explanation does not claim to reproduce the internal score", () => {
  const model = buildExplainRankingModel(listing);
  assert.match(model.limitation, /ne révèlent ni les pondérations, ni un score de classement/);
});

test("property passport renders the explain ranking contract", () => {
  const panel = readFileSync(resolve(process.cwd(), "components/search/PropertyPassportPanel.tsx"), "utf8");
  assert.match(panel, /buildExplainRankingModel/);
  assert.match(panel, /ranking\.title/);
  assert.match(buildExplainRankingModel(listing).title, /Pourquoi ce résultat peut apparaître ici/);
  assert.ok(!panel.includes("score caché"));
});

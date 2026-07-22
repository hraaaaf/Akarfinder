import assert from "node:assert/strict";
import test from "node:test";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify.js";
import { decideAdmission } from "../../../lib/openserp-ingestion/national-admission.js";
import { extractCityNational, extractDistrictNational } from "../../../lib/openserp-ingestion/national-utils.js";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types.js";

function query(overrides: Partial<OpenSerpIngestionQuery> = {}): OpenSerpIngestionQuery {
  return {
    query_id: "recovery-test",
    city: "Rabat",
    district: "",
    transaction_type: "rent",
    property_type: "appartement",
    query_text: "appartement rabat location",
    priority: "high",
    ...overrides,
  };
}

function classify(input: { url: string; title: string; snippet?: string; query?: OpenSerpIngestionQuery }) {
  return classifyOpenSerpResult({
    result: {
      url: input.url,
      title: input.title,
      snippet: input.snippet ?? "",
      rank: 1,
    } as never,
    query: input.query ?? query(),
    engine: "duckduckgo",
    discovered_at: "2026-07-22T12:00:00.000Z",
    fallbackRank: 1,
    extractCityFn: extractCityNational,
    extractDistrictFn: extractDistrictNational,
  });
}

test("national extractor recognizes expansion cities in Latin and Arabic", () => {
  assert.equal(extractCityNational("Appartement à vendre à Dakhla"), "Dakhla");
  assert.equal(extractCityNational("شقة للبيع في الداخلة"), "Dakhla");
  assert.equal(extractCityNational("عقار في بني ملال"), "Béni Mellal");
});

test("Arabic strong individual listing can reach individual_listing and admission", () => {
  const q = query({ city: "Casablanca", transaction_type: "sale", query_text: "شقة للبيع الدار البيضاء" });
  const result = classify({
    url: "https://soukimmobilier.com/ar/casablanca/appartement/12345",
    title: "شقة للبيع في الدار البيضاء 90 m2",
    snippet: "شقة 90 m2 في الدار البيضاء",
    query: q,
  });
  assert.ok(result);
  assert.equal(result.classification_lane, "individual_listing");
  assert.equal(result.extracted.city, "Casablanca");

  const decision = decideAdmission({
    result: { url: result.original_url, title: result.title, snippet: result.snippet ?? "", rank: 1 } as never,
    query: q,
    engine: "duckduckgo",
    discovered_at: "2026-07-22T12:00:00.000Z",
    fallbackRank: 1,
  });
  assert.equal(decision.admitted, true);
});

test("generic service wording no longer rejects a corroborated individual listing", () => {
  const result = classify({
    url: "https://1immo.ma/appartement-haut-standing-rabat-36130",
    title: "Appartement à louer à Rabat",
    snippet: "Appartement 110 m2 2 chambres dans une résidence privée avec service sécurité 24h/24h.",
  });
  assert.ok(result);
  assert.equal(result.classification_lane, "individual_listing");
  assert.ok(result.classification_reasons.includes("generic_out_of_scope_ignored_for_corroborated_individual_path"));
});

test("category-like numeric slug is not promoted solely because a registry regex is broad", () => {
  const result = classify({
    url: "https://1immo.ma/appartements-a-louer-551",
    title: "Appartements à louer Immobilier Rabat OneImmo",
    snippet: "Liste des biens et appartements à louer à Rabat",
  });
  assert.ok(result);
  assert.notEqual(result.classification_lane, "individual_listing");
});

test("explicit vacation intent remains rejected even on a strong numeric listing path", () => {
  const result = classify({
    url: "https://1immo.ma/appartement-location-vacances-marrakech-12345",
    title: "Appartement à louer pour vacances à Marrakech",
    snippet: "Appartement 80 m2 location saisonnière pour les vacances",
    query: query({ city: "Marrakech", query_text: "appartement marrakech location" }),
  });
  assert.ok(result);
  assert.equal(result.classification_lane, "reject_out_of_scope");
  assert.ok(result.classification_reasons.includes("tourism_or_hospitality"));
});

import test from "node:test";
import assert from "node:assert/strict";

import { buildAkarInfoPassportForGatewayResult } from "@/lib/akarinfo/akarinfo-passport";
import { buildPublicResultSimilaritySummaries, groupPublicResultsBySimilarity } from "@/lib/public-result-similarity/group-public-results";
import { assertPublicResultSimilaritySafety } from "@/lib/public-result-similarity/public-safety";
import type { PublicResultSimilarityInput } from "@/lib/public-result-similarity/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function createGatewayResult(overrides: Partial<SearchGatewayNormalizedResult> = {}): SearchGatewayNormalizedResult {
  return {
    id: "gw-1",
    title: "Appartement a vendre Casablanca Maarif 120 m2 1250000 DH",
    snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 120 m2. Prix 1250000 DH.",
    original_url: "https://mubawab.ma/fr/a/1",
    display_url: "mubawab.ma/fr/a/1",
    source_id: "mubawab_serper",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir sur Mubawab",
    result_attribution_label: "Résultat web externe",
    thumbnail_risk_accepted: false,
    ...overrides,
  };
}

function toSimilarityInput(result: SearchGatewayNormalizedResult): PublicResultSimilarityInput {
  return {
    id: result.id,
    title: result.title,
    snippet: result.snippet,
    original_url: result.original_url,
    display_url: result.display_url,
    source_name: result.source_name,
    source_host: result.domain,
  };
}

test("two close results in same city/type/price/surface => similar_possible true", () => {
  const first = createGatewayResult();
  const second = createGatewayResult({
    id: "gw-2",
    title: "Appartement a vendre Casablanca Maarif 118 m2 1290000 DH",
    snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 118 m2. Prix 1290000 DH.",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_id: "avito_serper",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, true);
  assert.equal(summaries[second.id].similar_possible, true);
  assert.equal(summaries[first.id].similar_public_label, "Résultat similaire possible");
  assert.ok(summaries[first.id].similar_reasons_public.includes("Même ville"));
});

test("same title but different city => false", () => {
  const first = createGatewayResult({
    title: "Appartement luxe 120 m2 1250000 DH Casablanca",
  });
  const second = createGatewayResult({
    id: "gw-2",
    title: "Appartement luxe 120 m2 1250000 DH Rabat",
    snippet: "Appartement a Rabat Agdal 120 m2 1250000 DH.",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, false);
  assert.equal(summaries[second.id].similar_possible, false);
});

test("same city but different property type => false", () => {
  const first = createGatewayResult();
  const second = createGatewayResult({
    id: "gw-2",
    title: "Villa a vendre Casablanca Maarif 210 m2 2600000 DH",
    snippet: "Villa a Casablanca Maarif. Surface 210 m2. Prix 2600000 DH.",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, false);
});

test("price alone does not suffice", () => {
  const first = createGatewayResult({
    title: "Appartement 1250000 DH",
    snippet: "Prix 1250000 DH",
  });
  const second = createGatewayResult({
    id: "gw-2",
    title: "Maison 1290000 DH Fes",
    snippet: "Maison a Fes 1290000 DH",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, false);
});

test("title alone does not suffice", () => {
  const first = createGatewayResult({
    title: "Appartement lumineux",
    snippet: "Casablanca",
  });
  const second = createGatewayResult({
    id: "gw-2",
    title: "Appartement lumineux",
    snippet: "Rabat",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, false);
});

test("surface alone does not suffice", () => {
  const first = createGatewayResult({
    title: "Studio 60 m2 Casablanca",
    snippet: "Surface 60 m2",
  });
  const second = createGatewayResult({
    id: "gw-2",
    title: "Terrain 62 m2 Rabat",
    snippet: "Surface 62 m2",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.equal(summaries[first.id].similar_possible, false);
});

test("different source can be signaled as source differente a comparer", () => {
  const first = createGatewayResult();
  const second = createGatewayResult({
    id: "gw-2",
    title: "Appartement a vendre Casablanca Maarif 121 m2 1260000 DH",
    snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 121 m2. Prix 1260000 DH.",
    original_url: "https://avito.ma/fr/a/2",
    display_url: "avito.ma/fr/a/2",
    source_name: "Avito",
    domain: "avito.ma",
  });

  const summaries = buildPublicResultSimilaritySummaries([
    toSimilarityInput(first),
    toSimilarityInput(second),
  ]);

  assert.ok(summaries[first.id].similar_reasons_public.includes("Source différente à comparer"));
});

test("numeric score and group id are never exposed publicly", () => {
  const groups = groupPublicResultsBySimilarity([
    toSimilarityInput(createGatewayResult()),
    toSimilarityInput(
      createGatewayResult({
        id: "gw-2",
        title: "Appartement a vendre Casablanca Maarif 121 m2 1260000 DH",
        snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 121 m2. Prix 1260000 DH.",
        original_url: "https://avito.ma/fr/a/2",
        display_url: "avito.ma/fr/a/2",
        source_name: "Avito",
        domain: "avito.ma",
      }),
    ),
  ]);
  const publicSummary = buildPublicResultSimilaritySummaries([
    toSimilarityInput(createGatewayResult()),
    toSimilarityInput(
      createGatewayResult({
        id: "gw-2",
        title: "Appartement a vendre Casablanca Maarif 121 m2 1260000 DH",
        snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 121 m2. Prix 1260000 DH.",
        original_url: "https://avito.ma/fr/a/2",
        display_url: "avito.ma/fr/a/2",
        source_name: "Avito",
        domain: "avito.ma",
      }),
    ),
  ]);

  assert.ok(groups[0].summaries["gw-1"].similarity_score > 0);
  assert.ok(groups[0].summaries["gw-1"].similarity_group_id);
  const serialized = JSON.stringify(publicSummary["gw-1"]);
  assert.equal(serialized.includes("similarity_score"), false);
  assert.equal(serialized.includes("similarity_group_id"), false);
  assert.doesNotThrow(() => assertPublicResultSimilaritySafety(publicSummary["gw-1"]));
});

test("contact, whatsapp, email, image and gallery are never used or exposed", () => {
  const summary = buildPublicResultSimilaritySummaries([
    toSimilarityInput(
      createGatewayResult({
        title: "Appartement Casablanca WhatsApp 0612345678",
        snippet: "contact test@example.com galerie image",
      }),
    ),
  ])["gw-1"];

  const serialized = JSON.stringify(summary).toLowerCase();
  assert.equal(serialized.includes("whatsapp"), false);
  assert.equal(serialized.includes("contact"), false);
  assert.equal(serialized.includes("gallery"), false);
  assert.equal(serialized.includes("image"), false);
});

test("gateway keeps original external url and never creates /listings link", () => {
  const result = createGatewayResult();
  assert.ok(result.original_url.startsWith("https://"));
  assert.equal(result.original_url.includes("/listings/"), false);
});

test("forbidden wording stays absent", () => {
  const summary = buildPublicResultSimilaritySummaries([
    toSimilarityInput(createGatewayResult()),
  ])["gw-1"];

  const serialized = JSON.stringify(summary).toLowerCase();
  for (const forbidden of [
    "doublon confirmé",
    "annonce dupliquée",
    "annonce copiée",
    "arnaque",
    "annonce suspecte",
    "annonce fiable",
    "annonce vérifiée",
    "score de similarité",
    "score de fiabilité",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("0 result does not crash", () => {
  assert.deepEqual(buildPublicResultSimilaritySummaries([]), {});
});

test("gateway passport can carry safe similar result summary", () => {
  const summary = buildPublicResultSimilaritySummaries([
    toSimilarityInput(createGatewayResult()),
    toSimilarityInput(
      createGatewayResult({
        id: "gw-2",
        title: "Appartement a vendre Casablanca Maarif 121 m2 1260000 DH",
        snippet: "Appartement 3 chambres a Casablanca Maarif. Surface 121 m2. Prix 1260000 DH.",
        original_url: "https://avito.ma/fr/a/2",
        display_url: "avito.ma/fr/a/2",
        source_name: "Avito",
        domain: "avito.ma",
      }),
    ),
  ])["gw-1"];

  const passport = buildAkarInfoPassportForGatewayResult(createGatewayResult(), summary);
  assert.equal(passport.similar_results?.similar_possible, true);
  assert.equal(JSON.stringify(passport).includes("similarity_score"), false);
});

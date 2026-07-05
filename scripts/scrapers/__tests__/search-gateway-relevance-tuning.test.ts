import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSearchGatewayResult } from "../../../lib/search-gateway/search-gateway-normalizer.js";
import { rankSearchGatewayResults } from "../../../lib/search-gateway/search-gateway-ranking.js";
import {
  analyzeGatewayQueryContext,
  scoreGatewayResultRelevance,
} from "../../../lib/search-gateway/search-gateway-relevance-tuning.js";
import { buildSearchGatewayQueries } from "../../../lib/search-gateway/search-gateway-query-builder.js";

function makeResult(
  sourceId: string,
  title: string,
  url: string,
  snippet = "Resultat web externe. Apercu limite."
) {
  const normalized = normalizeSearchGatewayResult(
    {
      title,
      link: url,
      snippet,
    },
    sourceId,
  );
  assert.ok(normalized, `expected a normalized result for ${title}`);
  return normalized;
}

describe("gateway relevance tuning - query analysis", () => {
  it("detects rent/new/land/buy from the free-text query", () => {
    assert.equal(analyzeGatewayQueryContext({ q: "location studio casablanca" }).intent, "rent");
    assert.equal(analyzeGatewayQueryContext({ q: "programme neuf casablanca" }).intent, "new");
    assert.equal(analyzeGatewayQueryContext({ q: "terrain marrakech" }).intent, "land");
    assert.equal(analyzeGatewayQueryContext({ q: "appartement casablanca" }).intent, "buy");
  });

  it("extracts city and property type from the query when filters are absent", () => {
    const analysis = analyzeGatewayQueryContext({ q: "villa a vendre rabat" });
    assert.equal(analysis.city, "rabat");
    assert.equal(analysis.property_type, "villa");
  });
});

describe("gateway relevance tuning - ranking", () => {
  it("deprioritizes rent pages on a buy query", () => {
    const analysis = analyzeGatewayQueryContext({ q: "appartement casablanca" });
    const rent = makeResult(
      "mubawab_serper",
      "Location Appartement Casablanca, appartement a Louer - Mubawab",
      "https://www.mubawab.ma/fr/st/casablanca/appartements-a-louer",
    );
    const buy = makeResult(
      "sarouty_serper",
      "Appartements a vendre a Casablanca - Sarouty.ma",
      "https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/",
    );

    const rentScore = scoreGatewayResultRelevance(rent, analysis);
    const buyScore = scoreGatewayResultRelevance(buy, analysis);

    assert.ok(buyScore.totalScore > rentScore.totalScore);
    assert.equal(rentScore.flags.hasTransactionMismatch, true);
  });

  it("deprioritizes mixed buy/rent pages behind clean buy pages", () => {
    const ranked = rankSearchGatewayResults(
      [
        makeResult(
          "avito_serper",
          "Locations Immobilieres a Casablanca a louer - Avito",
          "https://www.avito.ma/sp/immobilier/location-appartement-casablanca-a-vendre",
        ),
        makeResult(
          "sarouty_serper",
          "Appartements a vendre a Casablanca - Sarouty.ma",
          "https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/",
        ),
      ],
      { q: "appartement casablanca" },
    );

    assert.match(ranked[0].original_url, /sarouty/);
  });

  it("deprioritizes sale pages on a rent query", () => {
    const analysis = analyzeGatewayQueryContext({ q: "location studio casablanca" });
    const rent = makeResult(
      "sarouty_serper",
      "Studios a louer a Casablanca - Sarouty.ma",
      "https://www.sarouty.ma/louer/casablanca/studios-a-louer/",
    );
    const buy = makeResult(
      "avito_serper",
      "Studio a vendre a Casablanca - Avito",
      "https://www.avito.ma/sp/immobilier/studio-a-vendre-casablanca",
    );

    const ranked = rankSearchGatewayResults([buy, rent], { q: "location studio casablanca" });
    assert.equal(ranked[0].original_url, rent.original_url);
  });

  it("favors new-build pages over classic resale on a new query", () => {
    const ranked = rankSearchGatewayResults(
      [
        makeResult(
          "yakeey",
          "Appartement 166 m2 a vendre a Casablanca Les Princesses - Yakeey",
          "https://yakeey.com/fr-ma/acheter-appartement-casablanca-les-princesses-ca142459",
        ),
        makeResult(
          "avito_serper",
          "Appartements neufs a vendre sur Casablanca - Avito Immobilier Neuf",
          "https://immoneuf.avito.ma/fr/s/casablanca",
        ),
      ],
      { q: "programme neuf casablanca" },
    );

    assert.match(ranked[0].original_url, /immoneuf\.avito\.ma/);
  });

  it("deprioritizes monthly rental detail pages on a new-build query", () => {
    const ranked = rankSearchGatewayResults(
      [
        makeResult(
          "sarouty_serper",
          "Appartement de 95 m2 a Casablanca - Sarouty.ma",
          "https://www.sarouty.ma/en/property-details/?listing_id=896126",
          "A decouvrir : un appartement neuf de standing. Appartement de 95 m2 a Casablanca. 9 000 DH / Monthly.",
        ),
        makeResult(
          "yakeey",
          "Programme neuf a Casablanca Finance City a partir de 2 790 000 DH",
          "https://yakeey.com/fr-ma/programme/acheter-appartement-casablanca-casablanca-finance-city-pc000342",
          "Programme neuf avec appartements et livraison future a Casablanca Finance City.",
        ),
      ],
      { q: "programme neuf casablanca" },
    );

    assert.match(ranked[0].original_url, /yakeey\.com/);
    assert.match(ranked[1].original_url, /sarouty\.ma/);

    const breakdown = scoreGatewayResultRelevance(ranked[1], analyzeGatewayQueryContext({ q: "programme neuf casablanca" }));
    assert.equal(breakdown.flags.hasTransactionMismatch, true);
  });

  it("favors terrain pages on terrain queries", () => {
    const ranked = rankSearchGatewayResults(
      [
        makeResult(
          "avito_serper",
          "Appartements a vendre a Marrakech - Avito",
          "https://www.avito.ma/sp/immobilier/appartement-marrakech",
        ),
        makeResult(
          "mubawab_serper",
          "Terrain Marrakech 120 M2 - Mubawab",
          "https://www.mubawab.ma/fr/sd/marrakech/terrain-a-vendre",
        ),
      ],
      { q: "terrain a vendre marrakech" },
    );

    assert.match(ranked[0].original_url, /terrain-a-vendre/);
  });

  it("penalizes national pages when a city is requested", () => {
    const analysis = analyzeGatewayQueryContext({ q: "appartement casablanca" });
    const national = makeResult(
      "yakeey",
      "Immobiliers en vente au Maroc - Yakeey",
      "https://yakeey.com/fr-ma/achat/biens/maroc",
    );
    const local = makeResult(
      "yakeey",
      "22 Appartements en vente a Casablanca Ain Sebaa - Yakeey",
      "https://yakeey.com/fr-ma/achat/appartement/casablanca/ain-sebaa",
    );

    const nationalScore = scoreGatewayResultRelevance(national, analysis);
    const localScore = scoreGatewayResultRelevance(local, analysis);

    assert.ok(localScore.totalScore > nationalScore.totalScore);
    assert.equal(nationalScore.flags.isNationalPage, true);
  });

  it("penalizes false city matches like Route de Fes in Marrakech", () => {
    const analysis = analyzeGatewayQueryContext({ q: "maison fes" });
    const wrongCity = makeResult(
      "yakeey",
      "Maison 39850 m2 a vendre a Marrakech Route De Fes - Yakeey",
      "https://yakeey.com/fr-ma/acheter-maison-marrakech-route-de-fes-mi189649",
    );
    const rightCity = makeResult(
      "avito_serper",
      "Maison a Fes - Avito",
      "https://www.avito.ma/sp/immobilier/maison-a-fes",
    );

    const wrongScore = scoreGatewayResultRelevance(wrongCity, analysis);
    const rightScore = scoreGatewayResultRelevance(rightCity, analysis);

    assert.ok(rightScore.totalScore > wrongScore.totalScore);
    assert.equal(wrongScore.flags.cityMismatch, true);
  });

  it("penalizes price reference pages", () => {
    const analysis = analyzeGatewayQueryContext({ q: "appartement marrakech" });
    const pricePage = makeResult(
      "yakeey",
      "Carte des prix de l'immobilier a Marrakech - Yakeey",
      "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/marrakech",
    );
    const local = makeResult(
      "mubawab_serper",
      "Appartement a vendre a Marrakech - Mubawab",
      "https://www.mubawab.ma/fr/st/marrakech/appartements-a-vendre",
    );

    const priceScore = scoreGatewayResultRelevance(pricePage, analysis);
    const localScore = scoreGatewayResultRelevance(local, analysis);

    assert.ok(localScore.totalScore > priceScore.totalScore);
    assert.equal(priceScore.flags.isPriceReferencePage, true);
  });
});

describe("gateway relevance tuning - query builder cost guards", () => {
  it("keeps q-only queries to one primary call per source", () => {
    const queries = buildSearchGatewayQueries({ q: "appartement casablanca", max_results_per_source: 10 });
    assert.ok(queries.length <= 6);
  });

  it("does not inject sale words into rent-intent structured queries", () => {
    const queries = buildSearchGatewayQueries({
      q: "studio",
      city: "Casablanca",
      property_type: "studio",
      intent: "rent",
      max_results_per_source: 10,
    });

    assert.ok(queries.length >= 6);
    assert.ok(queries.every((item) => !item.query.includes("vendre")));
  });

  it("keeps total query count bounded with structured context", () => {
    const queries = buildSearchGatewayQueries({
      q: "villa",
      city: "Rabat",
      property_type: "villa",
      intent: "buy",
      max_results_per_source: 10,
    });

    assert.ok(queries.length <= 12);
  });
});

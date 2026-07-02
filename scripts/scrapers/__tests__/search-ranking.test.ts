import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRankingScore } from "../../../lib/search/ranking.js";
import type { Listing } from "../../../lib/listings/types.js";

function createListing(overrides: Partial<Listing>): Listing {
  return {
    id: "1",
    title: "Test Listing",
    city: "Casablanca",
    neighborhood: "Maarif",
    district: "Maarif",
    property_type: "Appartement",
    transaction_type: "rent",
    price: 10000,
    price_mad: 10000,
    surface_m2: 80,
    bedrooms: 2,
    bathrooms: 1,
    description_snippet: "Nice apartment",
    source_name: "test",
    reliability_score: 70,
    data_completeness_score: 80,
    ...overrides,
  };
}

describe("computeRankingScore", () => {
  describe("City match priority", () => {
    it("prioritizes exact city match (+40 points)", () => {
      const listing = createListing({
        city: "Rabat",
        title: "Appartement",
        reliability_score: 50,
        data_completeness_score: 50,
      });

      const scoreWithCity = computeRankingScore(listing, { city: "Rabat" });
      const scoreWithoutCity = computeRankingScore(listing, { city: "Casablanca" });

      assert.ok(scoreWithCity > scoreWithoutCity);
      assert.ok(scoreWithCity >= 40); // City match bonus
    });
  });

  describe("District match priority", () => {
    it("prioritizes exact district match (+35 points)", () => {
      const listing = createListing({
        city: "Rabat",
        district: "Agdal",
      });

      const scoreWithDistrict = computeRankingScore(listing, {
        city: "Rabat",
        q: "Agdal",
      });
      const scoreWithoutDistrict = computeRankingScore(listing, {
        city: "Rabat",
        q: "Souissi",
      });

      assert.ok(scoreWithDistrict > scoreWithoutDistrict);
      assert.ok(scoreWithDistrict >= 35); // District match bonus
    });
  });

  describe("Property type match", () => {
    it("prioritizes matching property type (+20 points)", () => {
      const listing = createListing({
        property_type: "Villa",
      });

      const scoreWithType = computeRankingScore(listing, {
        property_type: "Villa",
      });
      const scoreWithoutType = computeRankingScore(listing, {
        property_type: "Appartement",
      });

      assert.ok(scoreWithType > scoreWithoutType);
      assert.ok(scoreWithType >= 20); // Property type match bonus
    });
  });

  describe("Transaction type match", () => {
    it("prioritizes matching transaction type (+15 points)", () => {
      const listing = createListing({
        transaction_type: "buy",
      });

      const scoreWithTrans = computeRankingScore(listing, {
        transaction_type: "buy",
      });
      const scoreWithoutTrans = computeRankingScore(listing, {
        transaction_type: "rent",
      });

      assert.ok(scoreWithTrans > scoreWithoutTrans);
      assert.ok(scoreWithTrans >= 15); // Transaction match bonus
    });
  });

  describe("Text relevance", () => {
    it("scores text relevance by token matching", () => {
      const listing = createListing({
        title: "Villa luxe avec piscine",
        city: "Marrakech",
      });

      const scoreWithMatch = computeRankingScore(listing, {
        q: "villa marrakech piscine",
      });
      const scoreNoMatch = computeRankingScore(listing, {
        q: "studio rabat",
      });

      assert.ok(scoreWithMatch > scoreNoMatch);
    });
  });

  describe("Completeness bonus", () => {
    it("rewards complete listings", () => {
      const completeListing = createListing({
        title: "Complete Listing",
        price: 10000,
        surface_m2: 100,
        city: "Casablanca",
        district: "Maarif",
        description_snippet: "Full description",
      });

      const incompleteListing = createListing({
        title: undefined,
        price: 0,
        surface_m2: 0,
        city: "Casablanca",
        district: undefined,
        description_snippet: undefined,
      });

      const completeScore = computeRankingScore(completeListing, {});
      const incompleteScore = computeRankingScore(incompleteListing, {});

      assert.ok(completeScore > incompleteScore);
    });
  });

  describe("Reliability bonus", () => {
    it("applies small reliability bonus (max +5)", () => {
      const listing = createListing({
        reliability_score: 90,
      });

      const highScore = computeRankingScore(listing, {});

      const listing2 = createListing({
        reliability_score: 30,
      });

      const lowScore = computeRankingScore(listing2, {});

      assert.ok(highScore > lowScore);
      // Bonus should be small, not dominating
      assert.ok(highScore - lowScore < 20);
    });
  });

  describe("Combined scenario: Rabat Agdal", () => {
    it("ranks Rabat Agdal result first over other cities", () => {
      const rabatAgdal = createListing({
        city: "Rabat",
        district: "Agdal",
        title: "Appartement Agdal Rabat",
      });

      const casablancaMaarif = createListing({
        city: "Casablanca",
        district: "Maarif",
        title: "Appartement Maarif Casablanca",
      });

      const scoreRabat = computeRankingScore(rabatAgdal, {
        city: "Rabat",
        q: "agdal",
      });

      const scoreCasablanca = computeRankingScore(casablancaMaarif, {
        city: "Rabat",
        q: "agdal",
      });

      assert.ok(scoreRabat > scoreCasablanca);
    });
  });

  describe("Combined scenario: Casablanca Maarif", () => {
    it("ranks Casablanca Maarif result first", () => {
      const maarif = createListing({
        city: "Casablanca",
        district: "Maarif",
        title: "Villa Maarif",
      });

      const ainDiab = createListing({
        city: "Casablanca",
        district: "Ain Diab",
        title: "Villa Ain Diab",
      });

      const scoreMaarif = computeRankingScore(maarif, {
        city: "Casablanca",
        q: "maarif",
      });

      const scoreAinDiab = computeRankingScore(ainDiab, {
        city: "Casablanca",
        q: "maarif",
      });

      assert.ok(scoreMaarif > scoreAinDiab);
    });
  });

  describe("Property type prioritization: villa vs apartment", () => {
    it("ranks villa first when searching for villa", () => {
      const villa = createListing({
        property_type: "Villa",
        title: "Villa Marrakech",
      });

      const apartment = createListing({
        property_type: "Appartement",
        title: "Apartment Marrakech",
      });

      const scoreVilla = computeRankingScore(villa, {
        property_type: "Villa",
      });

      const scoreApt = computeRankingScore(apartment, {
        property_type: "Villa",
      });

      assert.ok(scoreVilla > scoreApt);
    });
  });

  describe("No suppression of results", () => {
    it("scores all results positively (never negative)", () => {
      const listing = createListing({
        city: "Fès",
        title: "Random property",
        reliability_score: 10,
        data_completeness_score: 10,
      });

      const score = computeRankingScore(listing, {
        city: "Rabat",
        q: "villa casablanca",
      });

      assert.ok(score >= 0, "Score should never be negative");
    });
  });

  describe("Reliability does not override exact match", () => {
    it("exact city match ranks higher even with low reliability", () => {
      const exactMatch = createListing({
        city: "Rabat",
        title: "Appartement Rabat",
        reliability_score: 20, // Low reliability
      });

      const outOfZone = createListing({
        city: "Casablanca",
        title: "Très fiable",
        reliability_score: 95, // Very high reliability
      });

      const scoreExact = computeRankingScore(exactMatch, {
        city: "Rabat",
      });

      const scoreOutOfZone = computeRankingScore(outOfZone, {
        city: "Rabat",
      });

      assert.ok(scoreExact > scoreOutOfZone);
    });
  });

  describe("Case insensitivity", () => {
    it("handles different cases consistently", () => {
      const listing = createListing({
        city: "rabat",
        title: "APPARTEMENT AGDAL",
      });

      const score1 = computeRankingScore(listing, {
        city: "Rabat",
        q: "agdal",
      });

      const score2 = computeRankingScore(listing, {
        city: "RABAT",
        q: "AGDAL",
      });

      assert.equal(score1, score2);
    });
  });

  describe("Accent normalization", () => {
    it("handles accents in district names", () => {
      const listing = createListing({
        district: "Guéliz",
      });

      const score1 = computeRankingScore(listing, {
        q: "Guéliz",
      });

      const score2 = computeRankingScore(listing, {
        q: "Gueliz",
      });

      assert.ok(Math.abs(score1 - score2) < 5); // Very similar despite accent
    });
  });
});

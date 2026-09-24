import assert from "node:assert/strict";
import test from "node:test";
import { classifyHarvestResult } from "@/lib/serper-mass-harvest/core";
import type { HarvestQuery } from "@/lib/serper-mass-harvest/types";

const query: HarvestQuery = {
  id: "recovery-200k",
  phase: "discovery",
  source_id: "long_tail",
  query: "immobilier maroc",
  city: "Casablanca",
  property_type: "appartement",
  intent: "sale",
};

test("MarocAnnonces direct detail route is accepted", () => {
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://marocannonces.com/categorie/315/Appartements/annonce/7564632/Appartement-a-vendre-a-sidi-maarouf.html",
    title: "Appartement a vendre à sidi maarouf",
    snippet: "Appartement 87 m² 2 chambres Casablanca",
  });
  assert.equal(result.status, "accepted");
  assert.ok(result.reasons.includes("registry_individual_listing_pattern"));
});

test("MarocAnnonces category route remains rejected", () => {
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://marocannonces.com/categorie/315/Vente-immobilier/Appartements/379.html",
    title: "Vente immobilier Appartements",
    snippet: "Annonces immobilières au Maroc",
  });
  assert.equal(result.status, "rejected");
});

test("Sarout.ma direct detail route is accepted", () => {
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://sarout.ma/fr/annonce/723/appartement-189-m2-en-vente-casablanca",
    title: "Appartement 189 m2 en vente à Casablanca",
    snippet: "Appartement 189 m² 1 690 000 DH",
  });
  assert.equal(result.status, "accepted");
  assert.ok(result.reasons.includes("registry_individual_listing_pattern"));
});

test("Sarout.ma collection route remains rejected", () => {
  const result = classifyHarvestResult({
    query,
    canonicalUrl: "https://sarout.ma/fr/annonces",
    title: "Annonces immobilières au Maroc",
    snippet: "Des milliers d'annonces vente location",
  });
  assert.equal(result.status, "rejected");
});

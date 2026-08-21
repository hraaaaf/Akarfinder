import test from "node:test";
import assert from "node:assert/strict";
import {
  AKARFINDER_SELLER_SCORE_MIN_PUBLISH,
  calculateAkarFinderSellerScore,
  sellerPublicationGate,
  sellerScoreInputFromDeclaredFacts,
} from "../../../lib/seller/listing-score";
import {
  buildSellerDeclaredFacts,
  normalizeSellerPropertyDraftInput,
  prepareSellerPropertyDraft,
} from "../../../lib/seller/seller-property-draft";

test("P8 V4 score stays low for an empty dossier", () => {
  const result = calculateAkarFinderSellerScore({});
  assert.ok(result.score < 20);
  assert.equal(result.label, "À compléter");
  assert.ok(result.nextAction);
});

test("P8 V4 rich apartment can cross the publication score without verified-document fiction", () => {
  const result = calculateAkarFinderSellerScore({
    propertyType: "Appartement",
    transactionType: "sale",
    city: "Rabat",
    neighborhood: "Agdal",
    residenceName: "Résidence Atlas",
    privateAddress: "Adresse privée déclarée",
    surface: 118,
    price: 2450000,
    bedrooms: 3,
    bathrooms: 2,
    rooms: 4,
    floorNumber: 4,
    condition: "Bon état",
    orientation: "Sud-Ouest",
    viewType: "Dégagée",
    constructionYear: 2018,
    hasElevator: true,
    hasParking: true,
    hasTerrace: true,
    hasBalcony: false,
    hasEquippedKitchen: true,
    hasAirConditioning: true,
    isFurnished: false,
    title: "Appartement lumineux avec terrasse",
    description: "Appartement lumineux avec une terrasse exploitable, un séjour traversant et des informations précises sur son état et son agencement.",
    contactComplete: true,
    legalStatusDeclared: "Titre foncier déclaré",
    documentsAvailable: true,
    verifiedDocumentsCount: 0,
    acceptedPhotoCount: 8,
  });

  assert.ok(result.score >= AKARFINDER_SELLER_SCORE_MIN_PUBLISH);
  const trust = result.dimensions.find((dimension) => dimension.key === "trust");
  assert.ok(trust);
  assert.ok((trust?.score ?? 0) < 20, "seller declaration must not receive document-verification points");
});

test("P8 V4 terrain profile does not require bedrooms or bathrooms", () => {
  const result = calculateAkarFinderSellerScore({
    propertyType: "Terrain",
    transactionType: "sale",
    city: "Rabat",
    neighborhood: "Souissi",
    surface: 500,
    price: 4000000,
    condition: "Terrain nu",
    landConstructibleStatus: "À confirmer",
    zoningType: "Résidentiel déclaré",
    frontageM: 20,
    roadAccessWidthM: 12,
    utilitiesWater: true,
    utilitiesElectricity: true,
    utilitiesSewer: true,
    title: "Terrain à Souissi",
    description: "Terrain déclaré par son propriétaire avec façade, accès routier et disponibilité des réseaux renseignés sans extrapolation.",
    contactComplete: true,
    legalStatusDeclared: "Titre foncier déclaré",
    documentsAvailable: true,
    acceptedPhotoCount: 6,
  });

  assert.ok(result.score >= 60);
  assert.equal(result.nextAction === "Préciser les chambres", false);
  assert.equal(result.nextAction === "Préciser les salles de bain", false);
});

test("P8 V4 rich seller payload is normalized and projected to canonical declared facts", () => {
  const input = normalizeSellerPropertyDraftInput({
    transactionType: "sale",
    propertyType: "Appartement",
    city: " Rabat ",
    neighborhood: "Agdal",
    surface: 118,
    price: 2450000,
    bedrooms: 3,
    bathrooms: 2,
    hasElevator: true,
    hasParking: true,
    negotiable: true,
    legalStatusDeclared: "Titre foncier",
    documentsAvailable: true,
    contactComplete: true,
  });
  const facts = buildSellerDeclaredFacts(input);

  assert.equal(facts["classification.property_type"], "apartment");
  assert.equal(facts["location.city"], "Rabat");
  assert.equal(facts["layout.bathrooms_count"], 2);
  assert.equal(facts["features.has_elevator"], true);
  assert.equal(facts["offer.negotiable_declared"], true);
  assert.equal(facts["legal.legal_documents_available"], true);
  assert.equal(facts["seller.contact_complete"], true);
});

test("P8 V4 server publication gate cannot be bypassed by score alone", () => {
  const draft = prepareSellerPropertyDraft({
    transactionType: "sale",
    propertyType: "Appartement",
    city: "Rabat",
    neighborhood: "Agdal",
    surface: 118,
    price: 2450000,
    bedrooms: 3,
    bathrooms: 2,
    condition: "Bon état",
    contactComplete: true,
  });

  const scoreInput = sellerScoreInputFromDeclaredFacts(draft.declared_facts, 3, 0);
  const score = calculateAkarFinderSellerScore(scoreInput);
  const tooFewPhotos = sellerPublicationGate({
    facts: draft.declared_facts,
    score: Math.max(score.score, 90),
    photoCount: 2,
  });
  assert.equal(tooFewPhotos.eligible, false);
  assert.ok(tooFewPhotos.missing.some((item) => item.includes("3 photos")));

  const lowScore = sellerPublicationGate({
    facts: draft.declared_facts,
    score: 59,
    photoCount: 3,
  });
  assert.equal(lowScore.eligible, false);
  assert.ok(lowScore.missing.some((item) => item.includes("60/100")));

  const eligible = sellerPublicationGate({
    facts: draft.declared_facts,
    score: 60,
    photoCount: 3,
  });
  assert.equal(eligible.eligible, true);
});

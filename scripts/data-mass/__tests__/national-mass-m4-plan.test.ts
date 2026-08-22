import test from "node:test";
import assert from "node:assert/strict";
import {
  buildM4NationalWritePlan,
  filterM4Wave1Manifest,
  M4_WAVE1_DOMAINS,
  selectM4RoundRobinCanary,
  summarizeM4Plan,
} from "../national-mass-m4-plan";
import type { UniversalCandidatePromotionRow } from "../universal-candidate-promotion";

function accepted(sourceDomain: string, canonicalUrl: string, providers = ["openserp"]): UniversalCandidatePromotionRow {
  return {
    canonicalUrl,
    sourceDomain,
    providers,
    rawRows: 1,
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    lastSeenAt: "2026-08-22T00:00:00.000Z",
    title: "Appartement à vendre à Rabat",
    snippet: "Appartement 90 m2 à Rabat",
    discoveryQuery: "appartement rabat",
    classification: {
      sourceDomain,
      domainRole: "UNKNOWN",
      likelyRealEstate: true,
      realEstateScore: 5,
      pageKind: "LIKELY_LISTING_DETAIL",
      geographyScope: "MOROCCO_LIKELY",
      transactionSignal: "SALE",
      detectedCities: ["Rabat"],
      reasons: ["test fixture"],
    },
    promotionStatus: "EXTERNAL_INDEX_CANDIDATE",
    rejectionReason: null,
  };
}

test("M4 wave 1 contains only M3 positive sources", () => {
  assert.deepEqual(M4_WAVE1_DOMAINS, [
    "marocannonces.com",
    "domio.ma",
    "sakane.ma",
    "1000-annonces.com",
    "housing.place",
    "expat.com",
    "milkiya.ma",
  ]);
});

test("M4 applies M1 plus source-specific M3 guard", () => {
  const rows = [
    accepted("marocannonces.com", "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html"),
    accepted("marocannonces.com", "https://marocannonces.com/maroc/location-appartements-temara-b321-t605.html"),
    accepted("yakeey.com", "https://yakeey.com/fr-ma/acheter-appartement-agadir-cite-charaf-AI146888"),
    accepted("housing.place", "https://housing.place/fr-ma/catalogue/annonces/MAYR-PP35-AY3T-4L5H"),
  ];
  const filtered = filterM4Wave1Manifest(rows);
  assert.deepEqual(filtered.map((row) => row.canonicalUrl), [
    "https://housing.place/fr-ma/catalogue/annonces/MAYR-PP35-AY3T-4L5H",
    "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html",
  ]);
});

test("M4 rejects source-detail URLs carrying contact identifiers", () => {
  const rows = [
    accepted("sakane.ma", "https://sakane.ma/maisons-et-villas/maison/asilah/8287/+212661590451"),
    accepted("sakane.ma", "https://sakane.ma/appartements/appartement/casablanca/8410/appartement-a-vendre-californie"),
  ];
  const filtered = filterM4Wave1Manifest(rows);
  assert.deepEqual(filtered.map((row) => row.canonicalUrl), [
    "https://sakane.ma/appartements/appartement/casablanca/8410/appartement-a-vendre-californie",
  ]);
  const summary = summarizeM4Plan(rows, buildM4NationalWritePlan(rows, []));
  assert.equal(summary.sourceSpecificDetail, 2);
  assert.equal(summary.safetyRejected, 1);
  assert.equal(summary.sourceSpecificValid, 1);
});

test("M4 preserves existing seeds and inserts only native net-new", () => {
  const rows = [
    accepted("marocannonces.com", "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html"),
    accepted("milkiya.ma", "https://milkiya.ma/fr_fr/Bien/location-bureau-86-m-a-casablanca", ["serper_mass_harvest", "openserp"]),
  ];
  const existing = [{
    canonical_url: rows[0].canonicalUrl!,
    source_domain: "marocannonces.com",
    seed_provider: "public_sitemap",
  }];
  const plan = buildM4NationalWritePlan(rows, existing);
  assert.equal(plan.length, 2);
  assert.equal(plan[0]?.action, "PRESERVE_EXISTING");
  assert.equal(plan[1]?.action, "INSERT_NATIVE");
  if (plan[1]?.action === "INSERT_NATIVE") assert.equal(plan[1].seed.seed_provider, "serper_mass_harvest");
});

test("M4 canary distributes inserts across positive domains", () => {
  const rows = [
    accepted("marocannonces.com", "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html"),
    accepted("marocannonces.com", "https://marocannonces.com/categorie/319/Villas/annonce/6165846/bar.html"),
    accepted("sakane.ma", "https://sakane.ma/appartements/appartement/casablanca/8410/appartement-a-vendre-californie"),
    accepted("milkiya.ma", "https://milkiya.ma/fr_fr/Bien/location-bureau-86-m-a-casablanca"),
  ];
  const plan = buildM4NationalWritePlan(rows, []);
  const canary = selectM4RoundRobinCanary(plan, 3);
  assert.deepEqual(canary.map((row) => row.seed.source_domain), ["marocannonces.com", "sakane.ma", "milkiya.ma"]);
});

test("M4 summary accounts source candidates through safety and write plan", () => {
  const rows = [
    accepted("marocannonces.com", "https://marocannonces.com/categorie/315/Appartements/annonce/4274325/foo.html"),
    accepted("housing.place", "https://housing.place/fr-ma/catalogue/casablanca-settat/casablanca/maarif/appartements"),
  ];
  const plan = buildM4NationalWritePlan(rows, []);
  const summary = summarizeM4Plan(rows, plan);
  assert.equal(summary.canonicalCandidates, 2);
  assert.equal(summary.m1Accepted, 2);
  assert.equal(summary.sourceSpecificDetail, 1);
  assert.equal(summary.safetyRejected, 0);
  assert.equal(summary.sourceSpecificValid, 1);
  assert.equal(summary.insertNative, 1);
  assert.equal(summary.preserveExisting, 0);
  assert.equal(summary.byDomain.find((row) => row.sourceDomain === "marocannonces.com")?.insertNative, 1);
});

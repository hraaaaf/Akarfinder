import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const publicSurfaceFiles = [
  "components/search/LightZillowSearchShell.tsx",
  "components/search/ExternalIndexedResultCard.tsx",
  "components/search/ExternalIndexedResultsSection.tsx",
  "components/search/SearchMapPanel.tsx",
  "components/search/PriceExplorerPanel.tsx",
  "components/search/NeighborhoodIntelligencePanel.tsx",
  "components/search/CertifiedNeighborhoodComparisonPanel.tsx",
  "components/search/CertifiedSimilarNeighborhoodsPanel.tsx",
  "components/landing/DataProofBlock.tsx",
  "components/landing/HowItWorks.tsx",
];

const retiredPublicPhrases = [
  "Annonces publiques indexées",
  "Analysé par AkarFinder",
  "Analyse partielle",
  "Offres observées sur le web",
  "Offre observée",
  "Aperçu limité",
  "Niveau d’information",
  "niveau d’information",
  "Catégorie de publication",
  "fiches indexées actuellement affichées",
  "la carte ne modifie ni le classement ni l’éligibilité",
  "Référence locale publiée",
  "Prix demandé agrégé publié",
  "Intelligence quartier",
  "Passeport local factuel",
  "Après rapprochement canonique",
  "identifiant canonique",
  "Intelligence non encore certifiable",
  "Comparer des références couvertes",
  "Proximité descriptive certifiée",
  "propriété(s) canonique(s)",
];

describe("SEARCH-WORDING-PURITY-1", () => {
  it("removes retired architecture-facing phrases from transactional surfaces", () => {
    const combined = publicSurfaceFiles.map(source).join("\n");
    for (const phrase of retiredPublicPhrases) {
      assert.ok(!combined.includes(phrase), `retired public phrase still visible in source: ${phrase}`);
    }
  });

  it("keeps source verification explicit without reintroducing architecture labels", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const externalCard = source("components/search/ExternalIndexedResultCard.tsx");
    const truth = source("lib/search/search-truth-tier.ts");

    assert.ok(shell.includes("data-search-continuous-flow"));
    assert.ok(externalCard.includes("Source externe"));
    assert.ok(externalCard.includes("Informations limitées"));
    assert.ok(truth.includes('tier: "observed"'));
    assert.ok(truth.includes('tier: "analyzed"'));
    assert.ok(truth.includes('tier: "partial"'));
    assert.match(externalCard, /site d’origine|source/i);
  });

  it("keeps useful neighborhood and price context in plain language", () => {
    const price = source("components/search/PriceExplorerPanel.tsx");
    const neighborhood = source("components/search/NeighborhoodIntelligencePanel.tsx");
    const comparison = source("components/search/CertifiedNeighborhoodComparisonPanel.tsx");
    const similar = source("components/search/CertifiedSimilarNeighborhoodsPanel.tsx");

    assert.ok(price.includes("Prix au m² dans ce secteur"));
    assert.ok(neighborhood.includes("Le quartier en chiffres"));
    assert.ok(neighborhood.includes("Après regroupement des annonces similaires"));
    assert.ok(comparison.includes("Prix et annonces côte à côte"));
    assert.ok(similar.includes("Des quartiers aux prix proches"));
    assert.match(`${price}\n${comparison}\n${similar}`, /Voir la source/);
  });

  it("keeps commercial ordering internal and untouched while hiding category prose", () => {
    const priority = source("lib/search/search-commercial-priority.ts");
    const shell = source("components/search/LightZillowSearchShell.tsx");

    assert.match(priority, /premium promoter inventory[\s\S]*authorized agency\/partner inventory[\s\S]*first-party user submissions[\s\S]*public indexed \/ observed inventory/i);
    const promoter = shell.indexOf("...commercialGroups.promoterPremium");
    const agency = shell.indexOf("...commercialGroups.agencyPartner");
    const direct = shell.indexOf("...commercialGroups.directUser");
    const analyzed = shell.indexOf("...commercialGroups.publicIndexed.analyzed");
    const partial = shell.indexOf("...commercialGroups.publicIndexed.partial");
    const observed = shell.indexOf("...commercialGroups.publicIndexed.observed");
    assert.ok(promoter >= 0 && agency > promoter && direct > agency && analyzed > direct && partial > analyzed && observed > partial);
    for (const retiredHeading of ["Promoteurs premium", "Agences partenaires", "Annonces sur AkarFinder", "Autres résultats", "Informations détaillées", "Informations à compléter", "Autres annonces"]) {
      assert.ok(!shell.includes(retiredHeading), `category heading should not interrupt the continuous flow: ${retiredHeading}`);
    }
  });

  it("keeps the homepage promise user-facing rather than architecture-facing", () => {
    const proof = source("components/landing/DataProofBlock.tsx");
    const how = source("components/landing/HowItWorks.tsx");

    assert.ok(proof.includes("Comparez sans perdre l’essentiel"));
    assert.ok(proof.includes("Source clairement indiquée"));
    assert.ok(how.includes("Votre recherche, simplement"));
    assert.ok(how.includes("prix, la source et les caractéristiques"));
  });
});

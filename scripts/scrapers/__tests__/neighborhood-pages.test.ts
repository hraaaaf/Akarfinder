import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { generateStaticParams } from "@/app/quartiers/[citySlug]/[neighborhoodSlug]/page";
import { getNeighborhoodBySlug, getNeighborhoods } from "@/lib/map/neighborhood-data";

describe("neighborhood pages MVP", () => {
  const quartiersPage = path.join(process.cwd(), "app/quartiers/page.tsx");
  const quartierPage = path.join(
    process.cwd(),
    "app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx"
  );
  const mapPageSource = fs.readFileSync(path.join(process.cwd(), "app/map/page.tsx"), "utf8");
  const searchPageSource = fs.readFileSync(path.join(process.cwd(), "app/search/page.tsx"), "utf8");
  const dynamicPageSource = fs.readFileSync(quartierPage, "utf8");
  const quartiersPageSource = fs.readFileSync(quartiersPage, "utf8");
  const dataSource = fs.readFileSync(path.join(process.cwd(), "lib/map/neighborhood-data.ts"), "utf8");

  it("/quartiers route exists", () => {
    assert.equal(fs.existsSync(quartiersPage), true);
  });

  it("route dynamique quartier existe", () => {
    assert.equal(fs.existsSync(quartierPage), true);
  });

  it("generateStaticParams utilise la donnée quartier", async () => {
    const params = await generateStaticParams();
    assert.equal(params.length, getNeighborhoods().length);
    assert.ok(params.every((param) => getNeighborhoodBySlug(param.citySlug, param.neighborhoodSlug)));
  });

  it("chaque page quartier vient d'un quartier connu", () => {
    const sample = getNeighborhoods()[0];
    assert.ok(getNeighborhoodBySlug(sample.citySlug, sample.neighborhoodSlug));
  });

  it("quartier inconnu déclenche notFound ou comportement sûr", () => {
    assert.equal(dynamicPageSource.includes("notFound()"), true);
    assert.equal(quartiersPageSource.includes("notFound()"), true);
  });

  it("metadata reste prudente", () => {
    assert.equal(dynamicPageSource.includes("Repères indicatifs"), true);
    assert.equal(dynamicPageSource.includes("prix exact"), false);
    assert.equal(dynamicPageSource.includes("garanti"), false);
  });

  it("les pages quartier ne référencent pas les helpers interdits", () => {
    for (const forbidden of ["searchListings", "applyGeoEnrichment", "property_listings", "listing_sources", "raw_listings"]) {
      assert.equal(dynamicPageSource.includes(forbidden), false, forbidden);
      assert.equal(quartiersPageSource.includes(forbidden), false, forbidden);
      assert.equal(dataSource.includes(forbidden), false, forbidden);
    }
  });

  it("aucun lien /listings n'est généré", () => {
    assert.equal(dynamicPageSource.includes("/listings"), false);
    assert.equal(quartiersPageSource.includes("/listings"), false);
  });

  it("CTA pointent vers /search ou /map", () => {
    assert.equal(dynamicPageSource.includes("/search"), true);
    assert.equal(dynamicPageSource.includes("/map"), true);
    assert.equal(quartiersPageSource.includes("/search"), true);
    assert.equal(quartiersPageSource.includes("/map"), true);
  });

  it("searchHref conserve l'encodage des accents", () => {
    assert.match(dataSource, /Maârif/);
    assert.match(dataSource, /Guéliz/);
  });

  it("aucun prix précis inventé n'apparaît dans les pages", () => {
    for (const precise of ["17 500 MAD/m²", "18 200 MAD/m²", "prix/m²"]) {
      assert.equal(dynamicPageSource.includes(precise), false, precise);
      assert.equal(quartiersPageSource.includes(precise), false, precise);
    }
  });

  it("wording risqué absent", () => {
    for (const word of [
      "annonces analysées",
      "biens analysés",
      "sources analysées",
      "données analysées",
      "index AkarFinder",
      "biens indexés",
      "densité d'annonces",
      "clusters d'annonces",
      "fiabilité moyenne des annonces",
      "prix réel",
      "prix exact",
      "garanti",
      "certifié",
      "officiel",
    ]) {
      assert.equal(dynamicPageSource.includes(word), false, word);
      assert.equal(quartiersPageSource.includes(word), false, word);
    }
  });

  it("reliability_score global reste intact", () => {
    const listingTypesSource = fs.readFileSync(
      path.join(process.cwd(), "lib/listings/types.ts"),
      "utf8"
    );
    assert.equal(listingTypesSource.includes("reliability_score"), true);
  });

  it("/search et /map restent inchangés au contrat", () => {
    assert.equal(searchPageSource.includes("searchListings"), true);
    assert.equal(mapPageSource.includes("MapNeighborhoodClient"), true);
  });
});

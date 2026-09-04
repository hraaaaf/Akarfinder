import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMarocAnnoncesPageOneRoutes,
  extractMarocAnnoncesListingRefs,
  runMarocAnnoncesPageOneDiscovery,
} from "../../../data-ingestion/sources/marocannonces/discovery";

test("MarocAnnonces Phase 0 exposes only verified page-one routes", () => {
  const routes = buildMarocAnnoncesPageOneRoutes();
  assert.deepEqual(routes.map((route) => route.key), [
    "sale_all",
    "rent_all",
    "apartment_sale",
    "apartment_rent",
  ]);
  assert.ok(routes.every((route) => !route.url.includes("pge=")));
});

test("MarocAnnonces discovery extracts numeric source IDs from public detail URLs", () => {
  const html = `
    <a href="/categorie/315/Appartements/annonce/10445677/Appartement-a-vendre.html">A</a>
    <a href="https://www.marocannonces.com/categorie/315/Appartements/annonce/10445677/Appartement-a-vendre.html?utm_source=test">duplicate</a>
    <a href="/categorie/321/Appartements/annonce/10440001/Appartement-a-louer.html">B</a>
    <a href="https://example.com/categorie/315/Appartements/annonce/99999999/external.html">external</a>
    <a href="/categorie/315/Vente-immobilier/Appartements.html">category</a>
  `;

  const refs = extractMarocAnnoncesListingRefs(
    html,
    "https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html",
  );

  assert.deepEqual(refs.map((ref) => ref.source_id), ["10445677", "10440001"]);
  assert.equal(refs[0].source_category_id, "315");
  assert.equal(refs[0].url, "https://www.marocannonces.com/categorie/315/Appartements/annonce/10445677/Appartement-a-vendre.html");
});

test("MarocAnnonces page-one manifest deduplicates IDs across control and primary routes", async () => {
  const html = `<a href="/categorie/315/Appartements/annonce/10445677/Appartement-a-vendre.html">A</a>`;
  const result = await runMarocAnnoncesPageOneDiscovery(async () => html, {
    now: () => "2026-09-04T00:00:00.000Z",
  });

  assert.equal(result.manifest.routes_total, 4);
  assert.equal(result.manifest.pages_succeeded, 4);
  assert.equal(result.manifest.unique_listings, 1);
  assert.equal(result.manifest.duplicate_refs, 3);
  assert.equal(result.listings[0].source_id, "10445677");
});

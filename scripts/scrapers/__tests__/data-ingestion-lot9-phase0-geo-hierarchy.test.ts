import assert from "node:assert/strict";
import test from "node:test";

import { extractGeoHierarchyEvidence } from "../../../data-ingestion/sources/mubawab/geo-hierarchy";

test("extracts page total and counted hierarchy children", () => {
  const html = `
    <body>
      <h2>Carte Casablanca-Settat</h2>
      <div>(26 522 résultats)</div>
      <ul>
        <li><a href="/fr/mprp/casablanca-settat/prefecture-de-casablanca/listing-promotion">Préfecture de Casablanca</a> (18 992 annonces)</li>
        <li><a href="/fr/mprp/casablanca-settat/province-de-nouaceur/listing-promotion">Province de Nouaceur</a> (3 420 annonces)</li>
      </ul>
      <a href="https://example.com/fr/mprp/fake">external</a>
    </body>`;

  const result = extractGeoHierarchyEvidence(html, "https://www.mubawab.ma/fr/mpr/casablanca-settat/listing-promotion");
  assert.equal(result.page_family, "mpr");
  assert.equal(result.page_total_results, 26522);
  assert.equal(result.children.length, 2);
  assert.deepEqual(result.children.map((child) => child.count).sort((a, b) => (a ?? 0) - (b ?? 0)), [3420, 18992]);
  assert(result.children.every((child) => child.family === "mprp"));
});

test("recognizes district map links leading to neighborhood inventory tw routes", () => {
  const html = `
    <body>
      <div>(5 070 résultats)</div>
      <div><a href="/fr/tw/casablanca/oasis">Oasis</a> (587 annonces)</div>
      <div><a href="/fr/tw/casablanca/palmier">Palmier</a> (618 annonces)</div>
    </body>`;
  const result = extractGeoHierarchyEvidence(html, "https://www.mubawab.ma/fr/mprptd/casablanca-settat/prefecture-de-casablanca/casablanca/maarif/listing-promotion");
  assert.equal(result.page_family, "mprptd");
  assert.equal(result.page_total_results, 5070);
  assert.deepEqual(result.children.map((child) => child.family), ["tw", "tw"]);
  assert.deepEqual(result.children.map((child) => child.count).sort((a, b) => (a ?? 0) - (b ?? 0)), [587, 618]);
});

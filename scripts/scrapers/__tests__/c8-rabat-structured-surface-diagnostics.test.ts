import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseStructuredSurface } from "../c8-rabat-structured-surface-diagnostics";

test("C8 structured diagnostics finds target listing surface in __NEXT_DATA__", () => {
  const payload = {
    props: {
      pageProps: {
        listing: {
          id: 343737,
          title: "Appartement",
          surface: 130,
        },
        recommendations: [{ id: 999999, surface: 85 }],
      },
    },
  };
  const html = `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script></head></html>`;
  const result = diagnoseStructuredSurface(html, "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/diour-jamaa/343737");
  assert.equal(result.targetListingId, "343737");
  assert.equal(result.jsonScriptCount, 1);
  assert.equal(result.parseableJsonScriptCount, 1);
  assert.equal(result.targetIdObjectCount, 1);
  assert.deepEqual(result.targetIdSurfaceCandidates, [130]);
  assert.deepEqual(result.allSurfaceKeyCandidates, [85, 130]);
});

test("C8 structured diagnostics does not confuse recommendation surfaces with the target listing", () => {
  const payload = {
    props: {
      pageProps: {
        listing: { id: 343737, title: "Appartement" },
        recommendations: [
          { id: 111111, surface: 90 },
          { id: 222222, superficie: "120 m²" },
        ],
      },
    },
  };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`;
  const result = diagnoseStructuredSurface(html, "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/diour-jamaa/343737");
  assert.deepEqual(result.targetIdSurfaceCandidates, []);
  assert.deepEqual(result.allSurfaceKeyCandidates, [90, 120]);
});

test("C8 structured diagnostics stays fail-closed on malformed or unrelated scripts", () => {
  const html = `
    <script type="application/json">not-json</script>
    <script>window.foo = { surface: 130 }</script>
    <script type="application/ld+json">${JSON.stringify({ "@type": "Apartment", name: "No target id", floorSize: 70 })}</script>
  `;
  const result = diagnoseStructuredSurface(html, "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/diour-jamaa/343737");
  assert.equal(result.jsonScriptCount, 2);
  assert.equal(result.parseableJsonScriptCount, 1);
  assert.equal(result.targetIdObjectCount, 0);
  assert.deepEqual(result.targetIdSurfaceCandidates, []);
  assert.deepEqual(result.allSurfaceKeyCandidates, [70]);
});

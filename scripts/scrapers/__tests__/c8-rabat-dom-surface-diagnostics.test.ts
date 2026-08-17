import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseDomSurfaceSignals } from "../c8-rabat-dom-surface-diagnostics";

test("DOM diagnostics exclude foreign listing anchors", () => {
  const html = `<html><body>
    <div class="property-details"><span>Surface 130 m²</span></div>
    <a href="/fr/annonces/immo-rabat/vente-appartements/diour-jamaa/999999"><span>90 m²</span></a>
  </body></html>`;
  const out = diagnoseDomSurfaceSignals(html, "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/diour-jamaa/123456");
  assert.equal(out.foreignListingLinkedCount, 1);
  assert.deepEqual(out.unlinkedSurfaceCandidates, [130]);
  assert.deepEqual(out.semanticSurfaceCandidates, [130]);
});

test("DOM diagnostics keep multiple unlinked values diagnostic-only", () => {
  const html = `<html><body><div><span>80 m²</span><span>120 m²</span></div></body></html>`;
  const out = diagnoseDomSurfaceSignals(html, "https://agenz.ma/fr/annonces/x/123456");
  assert.deepEqual(out.unlinkedSurfaceCandidates, [80, 120]);
  assert.deepEqual(out.semanticSurfaceCandidates, []);
});

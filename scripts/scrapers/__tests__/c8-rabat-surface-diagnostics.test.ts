import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseC8SurfaceSignals } from "../c8-rabat-surface-diagnostics";

test("C8 surface diagnostics expose only derived page signals", () => {
  const html = '<html><head><meta property="og:title" content="Appartement 130 m²"><title>Appartement 130 m²</title></head><body><script type="application/ld+json">{"floorSize":{"value":130}}</script><p>Surface 130 m²</p></body></html>';
  const result = diagnoseC8SurfaceSignals(html);
  assert.equal(result.strictSurfaceM2, 130);
  assert.equal(result.titleSurfaceM2, 130);
  assert.equal(result.jsonLdFloorSizePresent, true);
  assert.equal(result.titleM2TokenCount, 2);
  assert.equal(result.documentM2TokenCount >= 3, true);
  assert.equal(result.surfaceWordPresent, true);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "html"), false);
});

test("C8 surface diagnostics reveal body-only m2 signals without promoting them", () => {
  const html = '<html><head><title>Appartement Diour Jamaa</title></head><body><p>Surface totale 95 m²</p><div>Autre annonce 120 m²</div></body></html>';
  const result = diagnoseC8SurfaceSignals(html);
  assert.equal(result.strictSurfaceM2, null);
  assert.equal(result.titleSurfaceM2, null);
  assert.equal(result.titleM2TokenCount, 0);
  assert.equal(result.documentM2TokenCount, 2);
  assert.equal(result.surfaceWordPresent, true);
});

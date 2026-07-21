import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("public /vendre page contains no synthetic seller metrics, leads, or fixed estimate", () => {
  const vendre = source("components/vendre/VendrePageShell.tsx");

  for (const forbidden of [
    "const ESTIMATION",
    "const LEADS",
    "Salma R.",
    "Yassir M.",
    "Nadia E.",
    "+1k",
    "vues estimées",
    "Villa contemporaine avec piscine",
  ]) {
    assert.equal(vendre.includes(forbidden), false, `forbidden synthetic public data found: ${forbidden}`);
  }

  assert.match(vendre, /Aucune estimation personnalisée/);
  assert.match(vendre, /Nous n'affichons pas de faux exemples/);
});

test("listing enrichment never reconstructs a fake historical price or mock similarities", () => {
  const enrichment = source("lib/listings/enrichment.ts");

  assert.equal(enrichment.includes("dropFactor"), false);
  assert.equal(enrichment.includes("listing.price * 1.038"), false);
  assert.equal(enrichment.includes("listing.price * 1.06"), false);
  assert.match(enrichment, /getSimilarListings[\s\S]*return \[\];/);
});

test("listing history explicitly supports unavailable history", () => {
  const history = source("components/listings/ListingHistory.tsx");

  assert.match(history, /Historique indisponible/);
  assert.match(history, /n&apos;invente pas de prix antérieur ni de variation/);
  assert.equal(history.includes("Historique indicatif reconstitué"), false);
});

test("homepage data proof has no hardcoded public source count", () => {
  const proof = source("components/landing/DataProofBlock.tsx");

  assert.equal(proof.includes("PUBLIC_SOURCES_COUNT"), false);
  assert.equal(proof.includes("const PUBLIC_SOURCES_COUNT = 6"), false);
  assert.match(proof, /qualitative: "Multi-sources"/);
  assert.match(proof, /CITIES\.length/);
  assert.match(proof, /NEIGHBORHOOD_POINTS\.length/);
});

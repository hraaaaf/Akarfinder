import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CASABLANCA_REAL_PHOTO_LIBRARY,
  normalizeCasablancaNeighborhood,
  resolveCasablancaRealPhoto,
} from "../../../lib/contextual-illustrations/casablanca-real-photo-library";
import { MAARIF_NEIGHBORHOOD_VISUALS } from "../../../lib/contextual-illustrations/maarif-neighborhood-visuals";
import { resolveRealNeighborhoodPhoto } from "../../../lib/contextual-illustrations/real-neighborhood-photo-resolver";

const LOCAL_RESIDENTIAL_MASTER = "public/images/neighborhoods/casablanca/maarif/immobilier-v1.jpg";
const LOCAL_RESIDENTIAL_SHA1 = "a7d19b5cf7b2989554bd40b4dd9143e039e6929a";
const LOCAL_RESIDENTIAL_BYTES = 413452;

describe("NEIGHBORHOOD-VISUAL-P3.1 — Casablanca / Maârif", () => {
  it("locks exactly three truthful Maârif scene roles with unique source hashes", () => {
    assert.deepEqual(MAARIF_NEIGHBORHOOD_VISUALS.map((visual) => visual.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(MAARIF_NEIGHBORHOOD_VISUALS.map((visual) => visual.id)).size, 3);
    assert.equal(new Set(MAARIF_NEIGHBORHOOD_VISUALS.map((visual) => visual.source.sha1)).size, 3);
    assert.deepEqual(MAARIF_NEIGHBORHOOD_VISUALS.map((visual) => visual.source.sha1), [
      "b9477e67fbaa335ac9e0cf41aae4e4cd2472a040",
      LOCAL_RESIDENTIAL_SHA1,
      "c1816e02323e1ff6f40740693f5c0a12fb9bddb4",
    ]);
    assert.ok(MAARIF_NEIGHBORHOOD_VISUALS.every((visual) => visual.source.locationVerified));
    assert.ok(MAARIF_NEIGHBORHOOD_VISUALS.every((visual) => visual.truthBoundary.depictsSpecificProperty === false));
    assert.ok(MAARIF_NEIGHBORHOOD_VISUALS.every((visual) => visual.truthBoundary.claimInsideNeighborhood === false));
    assert.ok(MAARIF_NEIGHBORHOOD_VISUALS.every((visual) => visual.truthBoundary.claimPropertyForSale === false));
  });

  it("pins the mirrored KartaView residential master byte-for-byte", () => {
    const bytes = readFileSync(LOCAL_RESIDENTIAL_MASTER);
    assert.equal(bytes.byteLength, LOCAL_RESIDENTIAL_BYTES);
    assert.equal(createHash("sha1").update(bytes).digest("hex"), LOCAL_RESIDENTIAL_SHA1);
  });

  it("accepts only the explicit Maârif alias and never fuzzy-guesses another Casablanca district", () => {
    assert.equal(normalizeCasablancaNeighborhood("Maârif"), "Maârif");
    assert.equal(normalizeCasablancaNeighborhood("Maarif"), "Maârif");
    assert.equal(normalizeCasablancaNeighborhood("  MAARIF  "), "Maârif");
    assert.equal(normalizeCasablancaNeighborhood("Racine"), null);
    assert.equal(normalizeCasablancaNeighborhood("Maarif Extension"), null);
  });

  it("resolves deterministically only for exact Casablanca / Maârif structured context", () => {
    const pool = CASABLANCA_REAL_PHOTO_LIBRARY["Maârif"];
    assert.equal(pool.length, 3);
    assert.ok(pool.every((asset) => asset.label === "Casablanca • contexte Maârif"));
    const input = { stableKey: "https://example.test/casablanca/maarif/1", city: "Casablanca", district: "Maârif" };
    const first = resolveCasablancaRealPhoto(input);
    const second = resolveCasablancaRealPhoto(input);
    assert.ok(first);
    assert.deepEqual(second, first);
    assert.equal(first.contextScope, "district");
    assert.equal(first.district, "Maârif");
    assert.ok(pool.some((asset) => asset.id === first.id));
    assert.equal(resolveCasablancaRealPhoto({ ...input, city: "Rabat" }), null);
    assert.equal(resolveCasablancaRealPhoto({ ...input, district: "Racine" }), null);
  });

  it("routes through the national real-photo facade without regressing fail-closed behavior", () => {
    const resolved = resolveRealNeighborhoodPhoto({ stableKey: "https://example.test/casablanca/maarif/2", city: "Casablanca", district: "Maarif" });
    assert.ok(resolved);
    assert.equal(resolved.city, "Casablanca");
    assert.equal(resolved.district, "Maârif");
    assert.equal(resolveRealNeighborhoodPhoto({ stableKey: "x", city: "Casablanca", district: "Racine" }), null);
  });

  it("wires Search to the national real-neighborhood facade, not a Casablanca-specific shortcut", () => {
    const card = readFileSync("components/search/SearchListingCardDark.tsx", "utf8");
    assert.match(card, /resolveRealNeighborhoodPhoto/);
    assert.doesNotMatch(card, /resolveRabatRealPhoto\s*\(/);
  });
});

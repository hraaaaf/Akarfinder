import assert from "node:assert/strict";
import test from "node:test";
import {
  RABAT_CITY_AMBIENCE_POOL,
  RABAT_REAL_PHOTO_ASSETS,
  resolveRabatRealPhoto,
} from "../../../lib/contextual-illustrations/rabat-real-photo-library";

test("UX-VISUAL-INVENTORY keeps the existing Rabat photo library intact and curates a city ambience pool", () => {
  assert.equal(RABAT_REAL_PHOTO_ASSETS.length, 40);
  assert.ok(RABAT_CITY_AMBIENCE_POOL.length >= 20);
  assert.ok(RABAT_CITY_AMBIENCE_POOL.every((asset) => asset.city === "Rabat"));
  assert.ok(RABAT_CITY_AMBIENCE_POOL.every((asset) => asset.sourceName === "Wikimedia Commons"));
  assert.ok(RABAT_CITY_AMBIENCE_POOL.every((asset) => !asset.id.includes("fanzone")));
  assert.ok(RABAT_CITY_AMBIENCE_POOL.every((asset) => !asset.fileName.toLowerCase().includes("fanzone")));
  assert.ok(RABAT_CITY_AMBIENCE_POOL.every((asset) => !asset.fileName.toLowerCase().includes("knawa")));
});

test("UX-VISUAL-INVENTORY preserves exact district truth when a certified district pool exists", () => {
  const input = {
    stableKey: "https://fixture.example/rabat/agdal/42",
    city: "Rabat",
    district: "Agdal",
  };
  const first = resolveRabatRealPhoto(input);
  const replay = resolveRabatRealPhoto(input);

  assert.ok(first);
  assert.equal(first.contextScope, "district");
  assert.equal(first.district, "Agdal");
  assert.equal(first.label, "Rabat • Agdal");
  assert.equal(first.id, replay?.id);
  assert.match(first.asset, /^https:\/\/commons\.wikimedia\.org\//);
});

test("UX-VISUAL-INVENTORY uses a city-only real-photo fallback for unsupported Rabat districts", () => {
  const input = {
    stableKey: "https://fixture.example/rabat/akkari/7",
    city: "Rabat",
    district: "Akkari",
  };
  const first = resolveRabatRealPhoto(input);
  const replay = resolveRabatRealPhoto(input);

  assert.ok(first);
  assert.equal(first.contextScope, "city");
  assert.equal(first.label, "Rabat");
  assert.equal(first.id, replay?.id);
  assert.match(first.asset, /^https:\/\/commons\.wikimedia\.org\//);
  assert.ok(RABAT_CITY_AMBIENCE_POOL.some((asset) => asset.id === first.id));
});

test("UX-VISUAL-INVENTORY materially diversifies city-scope Rabat fallbacks", () => {
  const ids = new Set<string>();
  for (let index = 0; index < 32; index += 1) {
    const result = resolveRabatRealPhoto({
      stableKey: `https://fixture.example/rabat/unsupported/${index}`,
      city: "Rabat",
      district: index % 2 === 0 ? "Akkari" : "Yacoub El Mansour",
    });
    assert.ok(result);
    assert.equal(result.contextScope, "city");
    assert.equal(result.label, "Rabat");
    ids.add(result.id);
  }
  assert.ok(ids.size >= 12, `expected >=12 distinct city-scope photos, got ${ids.size}`);
});

test("UX-VISUAL-INVENTORY remains fail-closed outside Rabat", () => {
  assert.equal(
    resolveRabatRealPhoto({
      stableKey: "https://fixture.example/casablanca/maarif/1",
      city: "Casablanca",
      district: "Maarif",
    }),
    null,
  );
});

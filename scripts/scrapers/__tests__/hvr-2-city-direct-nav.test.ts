import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../../../components/landing/CityIntentGrid.tsx"), "utf-8");

describe("HVR-2 — compact direct city navigation", () => {
  it("keeps the six featured cities as direct search links", () => {
    for (const slug of ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"]) {
      assert.ok(source.includes(`"${slug}"`), `missing featured city ${slug}`);
    }
    assert.ok(source.includes("new URLSearchParams({ city: city.label })"));
    assert.ok(source.includes("href={buildCityHref(city)}"));
    assert.ok(source.includes("data-home-city={city.slug}"));
  });

  it("removes the old select-city-then-intent interaction", () => {
    for (const forbidden of ["useState", "selectedSlug", "selectedCity", "setSelectedSlug", "Ville choisie", "Votre projet à", "Choisissez une intention", "INTENTS", "buildIntentHref"]) {
      assert.ok(!source.includes(forbidden), `old two-step city interaction still present: ${forbidden}`);
    }
  });

  it("uses the HOME V1 compact secondary city layer", () => {
    assert.ok(source.includes("Villes populaires"));
    assert.ok(source.includes("Entrez par une ville, puis laissez le moteur faire le reste."));
    assert.ok(source.includes('data-home-city-layout="compact-v1"'));
    assert.ok(!source.includes("aspect-[4/5]"));
  });

  it("does not introduce fictitious listing counters", () => {
    for (const forbidden of ["annonces", "1M+", "241 000", "87 000", "71 000", "58 000", "20 000", "21 000"]) {
      assert.ok(!source.includes(forbidden), `fictitious counter copy present: ${forbidden}`);
    }
  });

  it("keeps city entries keyboard-focusable links", () => {
    assert.ok(source.includes("focus-visible:ring-2"));
    assert.ok(source.includes("aria-label={`Voir les biens à ${city.label}`}"));
    assert.ok(source.includes('import Link from "next/link"'));
  });
});

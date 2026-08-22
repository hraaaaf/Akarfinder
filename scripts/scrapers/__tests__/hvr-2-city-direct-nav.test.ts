import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../../../components/landing/CityIntentGrid.tsx"), "utf-8");

describe("HVR-2 — direct city navigation", () => {
  it("turns the six featured cities into direct search links", () => {
    for (const slug of ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"]) {
      assert.ok(source.includes(`"${slug}"`), `missing featured city ${slug}`);
    }
    assert.ok(source.includes("new URLSearchParams({ city: city.label })"));
    assert.ok(source.includes("href={buildCityHref(city)}"));
    assert.ok(source.includes('data-hvr2-city-card={city.slug}'));
  });

  it("removes the old select-city-then-intent interaction", () => {
    for (const forbidden of [
      "useState",
      "selectedSlug",
      "selectedCity",
      "setSelectedSlug",
      "Ville choisie",
      "Votre projet à",
      "Choisissez une intention",
      "INTENTS",
      "buildIntentHref",
    ]) {
      assert.ok(!source.includes(forbidden), `old two-step city interaction still present: ${forbidden}`);
    }
  });

  it("uses the approved HVR-2 section copy and action affordance", () => {
    assert.ok(source.includes("Explorer le Maroc"));
    assert.ok(source.includes("Choisissez une ville pour voir directement les biens disponibles"));
    assert.ok(source.includes("Voir les biens"));
    assert.ok(source.includes('data-hvr2-city-grid="direct"'));
  });

  it("does not introduce fictitious listing counters", () => {
    for (const forbidden of ["annonces", "1M+", "241 000", "87 000", "71 000", "58 000", "20 000", "21 000"]) {
      assert.ok(!source.includes(forbidden), `fictitious counter copy present: ${forbidden}`);
    }
  });

  it("keeps the city cards keyboard-focusable links", () => {
    assert.ok(source.includes("focus-visible:ring-2"));
    assert.ok(source.includes("aria-label={`Voir les biens à ${city.label}`}"));
    assert.ok(source.includes('import Link from "next/link"'));
  });
});

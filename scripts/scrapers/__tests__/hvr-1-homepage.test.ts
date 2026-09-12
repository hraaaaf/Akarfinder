// HVR-1 — HOME V1 hero composition contracts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (relPath: string) => readFileSync(resolve(__dirname, relPath), "utf-8");

describe("HVR-1 — HOME V1 hero composition", () => {
  const pageSource = read("../../../app/page.tsx");
  const heroSource = read("../../../components/home/GoogleLikeHero.tsx");
  const searchSource = read("../../../components/home/HomeSearchBar.tsx");
  const orchestratorSource = read("../../../components/home/SearchEntryOrchestrator.tsx");
  const trustSource = read("../../../components/home/HomeTrustStrip.tsx");

  it("uses the light SiteHeader on homepage", () => {
    assert.ok(pageSource.includes('<SiteHeader variant="light" compact />'));
    assert.ok(!pageSource.includes('<SiteHeader variant="transparent" compact />'));
  });

  it("preserves the approved hero copy and approved imagery", () => {
    assert.ok(heroSource.includes("1er moteur de recherche immobilier au Maroc"));
    assert.ok(heroSource.includes("Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider."));
    assert.ok(heroSource.includes("akar-residence-sunset-desktop.webp"));
    assert.ok(heroSource.includes("akar-residence-sunset-mobile.webp"));
  });

  it("keeps a search-only hero with no competing Intelligence panel", () => {
    assert.ok(heroSource.includes('data-home-hero-mode="search-only-v1"'));
    assert.ok(heroSource.includes("<SearchEntryOrchestrator />"));
    assert.ok(!heroSource.includes("HomeIntelligencePanel"));
    assert.ok(!orchestratorSource.includes("/compagnon"));
    assert.ok(!orchestratorSource.includes("Construire mon projet"));
  });

  it("keeps only the approved primary intents in the hero tabs", () => {
    for (const label of ["Acheter", "Louer", "Neuf"]) assert.ok(searchSource.includes(`label: "${label}"`));
    for (const removed of ["Villa", "Terrain", "Bureau", "Meublé"]) {
      assert.ok(!searchSource.includes(`label: "${removed}"`));
    }
  });

  it("moves qualitative intelligence into the compact trust strip", () => {
    assert.ok(trustSource.includes('data-home-trust-strip="v1"'));
    for (const required of ["Multi-source", "Sources visibles", "Marché & quartiers"]) {
      assert.ok(trustSource.includes(required), `missing trust signal: ${required}`);
    }
    for (const forbidden of ["1M+", "1 024 587", "14 580", "152 annonces", "+6,2%", "+8,5%", "Données vérifiées"]) {
      assert.ok(!trustSource.includes(forbidden), `forbidden mockup metric present: ${forbidden}`);
    }
  });
});

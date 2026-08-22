// HVR-1 — Homepage visual reconciliation contracts
// Locks the approved hero claim, white-header composition, real-data-only Intelligence,
// and the three primary search intents without touching search semantics.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (relPath: string) => readFileSync(resolve(__dirname, relPath), "utf-8");

describe("HVR-1 — homepage composition", () => {
  const pageSource = read("../../../app/page.tsx");
  const heroSource = read("../../../components/home/GoogleLikeHero.tsx");
  const searchSource = read("../../../components/home/HomeSearchBar.tsx");
  const intelligenceSource = read("../../../components/home/HomeIntelligencePanel.tsx");

  it("uses the light SiteHeader on homepage", () => {
    assert.ok(pageSource.includes('<SiteHeader variant="light" compact />'));
    assert.ok(!pageSource.includes('<SiteHeader variant="transparent" compact />'));
  });

  it("preserves the approved hero copy", () => {
    assert.ok(heroSource.includes("1er moteur de recherche immobilier au Maroc"));
    assert.ok(
      heroSource.includes(
        "Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider."
      )
    );
  });

  it("renders Intelligence inside the hero layout", () => {
    assert.ok(heroSource.includes("HomeIntelligencePanel"));
    assert.ok(heroSource.includes('data-home-hero-layout="hvr-1"'));
  });

  it("keeps only the approved primary intents in the hero tabs", () => {
    for (const label of ["Acheter", "Louer", "Neuf"]) assert.ok(searchSource.includes(`label: "${label}"`));
    for (const removed of ["Villa", "Terrain", "Bureau", "Meublé"]) {
      assert.ok(!searchSource.includes(`label: "${removed}"`));
    }
  });

  it("does not copy fictitious mockup metrics into Intelligence", () => {
    for (const forbidden of ["1M+", "1 024 587", "14 580", "152 annonces", "+6,2%", "+8,5%", "Données vérifiées"]) {
      assert.ok(!intelligenceSource.includes(forbidden), `forbidden mockup metric present: ${forbidden}`);
    }
  });

  it("uses only Lucide icons in the new Intelligence component", () => {
    assert.ok(intelligenceSource.includes('from "lucide-react"'));
    assert.ok(!intelligenceSource.includes("<svg"));
  });
});

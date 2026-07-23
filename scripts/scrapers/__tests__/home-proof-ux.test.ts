import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Homepage proof UX", () => {
  it("uses an evidence-safe hero claim", () => {
    const hero = source("components/home/GoogleLikeHero.tsx");
    assert.ok(hero.includes("Cherchez l&apos;immobilier marocain"));
    assert.ok(!hero.includes("Le 1er moteur de recherche immobilier"));
    assert.match(hero, /distinguez les fiches analysées des simples offres observées/i);
  });

  it("keeps one Companion entry plus one Mon Projet continuation", () => {
    const orchestrator = source("components/home/SearchEntryOrchestrator.tsx");
    assert.equal((orchestrator.match(/href="\/compagnon"/g) ?? []).length, 1);
    assert.equal((orchestrator.match(/href="\/mon-projet"/g) ?? []).length, 1);
    assert.ok(orchestrator.includes("Aidez-moi à définir mon projet"));
    assert.ok(orchestrator.includes("Reprendre Mon Projet"));
  });

  it("explains the product through real search/noise/information-level behavior", () => {
    const why = source("components/landing/WhySection.tsx");
    assert.ok(why.includes("Une recherche, plusieurs origines"));
    assert.ok(why.includes("Le bruit est signalé, pas maquillé"));
    assert.ok(why.includes("Vous savez ce qu'AkarFinder sait"));
    assert.match(why, /sans prétendre qu'il s'agit forcément du même bien/i);
  });

  it("separates live index proof from canonical reference counts", () => {
    const proof = source("components/landing/DataProofBlock.tsx");
    assert.ok(proof.includes("Index actuel"));
    assert.ok(proof.includes("Référentiel canonique"));
    assert.ok(proof.includes("GEO_CITIES.length"));
    assert.ok(proof.includes("getValidatedMapNeighborhoods().length"));
    assert.match(proof, /Toutes les lignes ne sont pas nécessairement publiables/i);
  });

  it("replaces the duplicate static city map with canonical neighborhood intelligence proof", () => {
    const map = source("components/landing/SignatureMapSection.tsx");
    assert.ok(map.includes("@/lib/map/canonical-neighborhood-data"));
    assert.ok(map.includes("Intelligence quartier"));
    assert.ok(map.includes("point.benchmark.period"));
    assert.ok(map.includes("point.confidence"));
    assert.ok(!map.includes("MAP_CITIES"));
  });

  it("has no dead newsletter input/button in the shared footer", () => {
    const footer = source("components/landing/SiteFooter.tsx");
    assert.ok(!footer.includes("Votre email"));
    assert.ok(!footer.includes(">OK<"));
    assert.ok(footer.includes('href="/mon-projet"'));
    assert.ok(footer.includes("Ouvrir Mon Projet"));
  });

  it("final CTA uses Search and Companion, not legacy buyer onboarding", () => {
    const cta = source("components/landing/HomeFinalCTA.tsx");
    assert.ok(cta.includes('href="/search"'));
    assert.ok(cta.includes('href="/compagnon"'));
    assert.ok(!cta.includes('href="/onboarding"'));
    assert.ok(cta.includes("Découvrir AkarFinder Pro"));
  });
});

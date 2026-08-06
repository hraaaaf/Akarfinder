import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Homepage proof UX", () => {
  it("uses the approved search-first hero claim and subtitle", () => {
    const hero = source("components/home/GoogleLikeHero.tsx");
    assert.ok(hero.includes("1er moteur de recherche immobilier au Maroc"));
    assert.ok(hero.includes("Une recherche plus claire, plus structurée et plus fiable pour l’immobilier au Maroc."));
    assert.ok(!hero.includes("analysez les biens"));
  });

  it("keeps one direct search entry and one Companion entry", () => {
    const orchestrator = source("components/home/SearchEntryOrchestrator.tsx");
    assert.equal((orchestrator.match(/href="\/compagnon"/g) ?? []).length, 1);
    assert.equal((orchestrator.match(/<HomeSearchBar/g) ?? []).length, 1);
    assert.equal((orchestrator.match(/href="\/mon-projet"/g) ?? []).length, 0);
    assert.ok(orchestrator.includes("Pas encore sûr de vos critères ? Construisez votre projet"));
  });

  it("explains the product with approved user-facing benefits", () => {
    const why = source("components/landing/WhySection.tsx");
    assert.ok(why.includes("Pourquoi rechercher avec AkarFinder ?"));
    assert.ok(why.includes("Rechercher plus intelligemment"));
    assert.ok(why.includes("Comprendre avant de visiter"));
    assert.ok(why.includes("Gagner du temps"));
    assert.ok(!why.includes("canonical"));
    assert.ok(!why.includes("cluster"));
  });

  it("shows transparent result proof without unstable public counters", () => {
    const proof = source("components/landing/DataProofBlock.tsx");
    assert.ok(proof.includes("Des résultats plus clairs pour mieux décider"));
    assert.ok(proof.includes("Source clairement indiquée"));
    assert.ok(proof.includes("Niveau d’information visible"));
    assert.ok(proof.includes("Résultats similaires mieux organisés"));
    assert.ok(!proof.includes("/api/stats"));
    assert.ok(!proof.includes("Index actuel"));
  });

  it("uses canonical neighborhood data for the approved Vivre ici experience", () => {
    const map = source("components/landing/SignatureMapSection.tsx");
    assert.ok(map.includes("@/lib/map/canonical-neighborhood-data"));
    assert.ok(map.includes("Vivre ici"));
    assert.ok(map.includes("Un bien ne se résume pas à ses mètres carrés."));
    assert.ok(map.includes("selected.benchmark.period"));
    assert.ok(map.includes("selected.confidence"));
    assert.ok(map.includes("Profil détaillé bientôt disponible"));
    assert.ok(!map.includes("MAP_CITIES"));
  });

  it("has no dead newsletter or redundant project block in the shared footer", () => {
    const footer = source("components/landing/SiteFooter.tsx");
    assert.ok(!footer.includes("Votre email"));
    assert.ok(!footer.includes(">OK<"));
    assert.ok(!footer.includes('href="/mon-projet"'));
    assert.ok(!footer.includes("Ouvrir Mon Projet"));
    assert.ok(footer.includes("Les sources et le niveau d&apos;information restent visibles pour chaque résultat."));
  });

  it("final CTA uses Search and Companion, not legacy buyer onboarding", () => {
    const cta = source("components/landing/HomeFinalCTA.tsx");
    assert.ok(cta.includes('href="/search"'));
    assert.ok(cta.includes('href="/compagnon"'));
    assert.ok(!cta.includes('href="/onboarding"'));
    assert.ok(cta.includes("Découvrir AkarFinder Pro"));
    assert.ok(cta.includes("Rechercher un bien"));
    assert.ok(cta.includes("Me laisser guider"));
  });
});

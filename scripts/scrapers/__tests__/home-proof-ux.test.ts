import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Homepage proof UX — HOME V1", () => {
  it("uses the approved search-first hero claim and subtitle", () => {
    const hero = source("components/home/GoogleLikeHero.tsx");
    assert.ok(hero.includes("1er moteur de recherche immobilier au Maroc"));
    assert.ok(hero.includes("Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider."));
    assert.ok(hero.includes('data-home-hero-mode="search-only-v1"'));
  });

  it("keeps one direct search entry and removes the legacy Companion hero entry", () => {
    const orchestrator = source("components/home/SearchEntryOrchestrator.tsx");
    assert.equal((orchestrator.match(/<HomeSearchBar/g) ?? []).length, 1);
    assert.equal(orchestrator.split('href="/compagnon"').length - 1, 0);
    assert.equal(orchestrator.split('href="/mon-projet"').length - 1, 0);
    assert.ok(!orchestrator.includes("Construire mon projet"));
  });

  it("keeps intelligence qualitative in the trust strip instead of competing in the hero", () => {
    const hero = source("components/home/GoogleLikeHero.tsx");
    const trust = source("components/home/HomeTrustStrip.tsx");
    assert.ok(!hero.includes("HomeIntelligencePanel"));
    assert.ok(trust.includes("Multi-source"));
    assert.ok(trust.includes("Sources visibles"));
    assert.ok(trust.includes("Marché & quartiers"));
    for (const forbidden of ["1M+", "1 024 587", "14 580 MAD"]) assert.ok(!trust.includes(forbidden));
  });

  it("keeps approved user-facing benefits available without requiring a homepage explainer", () => {
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
    assert.ok(proof.includes("Comparez sans perdre l’essentiel"));
    assert.ok(proof.includes("Source clairement indiquée"));
    assert.ok(proof.includes("Détails utiles en un coup d’œil"));
    assert.ok(proof.includes("Résultats proches mieux organisés"));
    assert.ok(!proof.includes("/api/stats"));
    assert.ok(!proof.includes("Index actuel"));
  });

  it("uses canonical neighborhood data for Vivre ici", () => {
    const map = source("components/landing/SignatureMapSection.tsx");
    assert.ok(map.includes("@/lib/map/canonical-neighborhood-data"));
    assert.ok(map.includes("Vivre ici"));
    assert.ok(map.includes("Comprendre le quartier avant de visiter"));
    assert.ok(map.includes("data-home-neighborhood-card"));
    assert.ok(map.includes("point.priceSignal.label"));
  });

  it("has no dead newsletter or redundant project block in the shared footer", () => {
    const footer = source("components/landing/SiteFooter.tsx");
    assert.ok(!footer.includes("Votre email"));
    assert.ok(!footer.includes(">OK<"));
    assert.ok(!footer.includes('href="/mon-projet"'));
    assert.ok(!footer.includes("Ouvrir Mon Projet"));
  });

  it("uses exactly the three approved final actions", () => {
    const page = source("app/page.tsx");
    const actions = source("components/home/HomeActionGrid.tsx");
    assert.ok(page.includes("<HomeActionGrid />"));
    assert.ok(!page.includes("<HomeFinalCTA />"));
    for (const href of ["/mon-projet", "/vendre", "/pro"]) assert.ok(actions.includes(`href: "${href}"`));
    for (const href of ["/search", "/compagnon"]) assert.ok(!actions.includes(`href: "${href}"`));
    assert.ok(actions.includes("La suite de votre projet"));
    assert.ok(actions.includes('data-home-action-count="3"'));
  });
});

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
    assert.ok(hero.includes("Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider."));
    assert.ok(!hero.includes("analysez les biens"));
  });

  it("keeps one direct search entry and one Companion entry", () => {
    const orchestrator = source("components/home/SearchEntryOrchestrator.tsx");
    assert.equal(orchestrator.split('href="/compagnon"').length - 1, 1);
    assert.equal((orchestrator.match(/<HomeSearchBar/g) ?? []).length, 1);
    assert.equal(orchestrator.split('href="/mon-projet"').length - 1, 0);
    assert.ok(orchestrator.includes("Construire mon projet"));
  });

  it("keeps HVR-1 Intelligence qualitative instead of publishing synthetic counters", () => {
    const intelligence = source("components/home/HomeIntelligencePanel.tsx");
    assert.ok(intelligence.includes("AkarFinder Intelligence"));
    assert.ok(intelligence.includes("Prix et offres visibles dans les résultats"));
    assert.ok(intelligence.includes("Source et fraîcheur affichées quand disponibles"));
    assert.ok(!intelligence.includes("1M+"));
    assert.ok(!intelligence.includes("1 024 587"));
    assert.ok(!intelligence.includes("14 580 MAD"));
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

  it("uses canonical neighborhood data for the approved HVR-4 action experience", () => {
    const map = source("components/landing/SignatureMapSection.tsx");
    assert.ok(map.includes("@/lib/map/canonical-neighborhood-data"));
    assert.ok(map.includes("Vivre ici"));
    assert.ok(map.includes("Comprendre le quartier avant de visiter"));
    assert.ok(map.includes("data-home-neighborhood-card"));
    assert.ok(map.includes("point.priceSignal.label"));
    assert.ok(!map.includes("Un bien ne se résume pas à ses mètres carrés."));
    assert.ok(!map.includes("Profil détaillé bientôt disponible"));
    assert.ok(!map.includes("selected.confidence"));
  });

  it("has no dead newsletter or redundant project block in the shared footer", () => {
    const footer = source("components/landing/SiteFooter.tsx");
    assert.ok(!footer.includes("Votre email"));
    assert.ok(!footer.includes(">OK<"));
    assert.ok(!footer.includes('href="/mon-projet"'));
    assert.ok(!footer.includes("Ouvrir Mon Projet"));
    assert.ok(footer.includes("Les sources et le niveau d&apos;information restent visibles pour chaque résultat."));
  });

  it("uses the HVR-5 action grid instead of a duplicated final CTA", () => {
    const page = source("app/page.tsx");
    const actions = source("components/home/HomeActionGrid.tsx");
    assert.ok(page.includes("<HomeActionGrid />"));
    assert.ok(!page.includes("<HomeFinalCTA />"));
    for (const href of ["/search", "/compagnon", "/vendre", "/pro"]) {
      assert.ok(actions.includes(`href: "${href}"`));
    }
    assert.ok(actions.includes("Que voulez-vous faire maintenant ?"));
    assert.ok(!actions.includes("4 000 000 DH"));
    assert.ok(!actions.includes("Biens enregistrés"));
  });
});

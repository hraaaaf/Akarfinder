import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const agencyLanding = read("app/pro/agences/page.tsx");
const promoterLanding = read("app/promoteurs/page.tsx");
const audiencePage = read("components/pro/ProfessionalAudiencePage.tsx");
const activationForm = read("components/pro/ProActivationForm.tsx");
const agencyDemo = read("app/demo/agence/page.tsx");
const promoterDemo = read("app/demo/promoteur/page.tsx");
const demoShell = read("components/demo/DemoShell.tsx");
const professionalRepository = read("lib/professional/repository.ts");
const legacyPromoterData = read("lib/promoters/promoters-data.ts");
const legacyPromoterRoute = read("app/promoteurs/[slug]/page.tsx");
const legacyPromoterRepository = read("lib/promoters/get-promoter.ts");

describe("B2B partner pages deep-audit contracts", () => {
  it("keeps agency and promoter acquisition routes canonical and cacheable", () => {
    assert.match(agencyLanding, /alternates:\s*\{ canonical: "\/pro\/agences" \}/);
    assert.match(promoterLanding, /alternates:\s*\{ canonical: "\/promoteurs" \}/);
    assert.doesNotMatch(promoterLanding, /force-dynamic/);
  });

  it("preserves audience context from landing CTA into the Pro activation form", () => {
    assert.match(audiencePage, /\/pro\?type=agence&source=agency#contact/);
    assert.match(audiencePage, /\/pro\?type=promoteur&source=promoter#contact/);
    assert.match(activationForm, /activationContextFromLocation/);
    assert.match(activationForm, /source === "agency" \? "\/pro\/agences"/);
    assert.match(activationForm, /source === "promoter" \? "\/promoteurs"/);
    assert.match(activationForm, /source_page: context\.sourcePage/);
    assert.match(activationForm, /phoneDigits\.length >= 8 && phoneDigits\.length <= 15/);
  });

  it("keeps fictive agency and promoter demos explicitly non-indexable and non-contractual", () => {
    assert.match(agencyDemo, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(promoterDemo, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(demoShell, /aucun partenaire réel n’est représenté/);
    assert.match(demoShell, /Une démonstration ne crée aucun statut partenaire actif/);
  });

  it("makes the acquisition pages demonstrate the actual partner experience instead of only describing the data contract", () => {
    assert.match(audiencePage, /Aperçu réel du rendu/);
    assert.match(audiencePage, /PropertyVisual/);
    assert.match(audiencePage, /villa-premium/);
    assert.match(audiencePage, /project-facade/);
    assert.match(audiencePage, /\/demo\/agence/);
    assert.match(audiencePage, /\/demo\/promoteur/);
    assert.match(audiencePage, /Aperçu de démonstration/);
  });

  it("explains onboarding, integration formats, deliverables, reporting and a short FAQ for both audiences", () => {
    assert.match(audiencePage, /Un onboarding pilote en trois étapes/);
    assert.match(audiencePage, /Formats d’intégration/);
    assert.match(audiencePage, /Livrables du pilote/);
    assert.match(audiencePage, /Reporting opérationnel/);
    assert.match(audiencePage, /Questions commerciales fréquentes/);
    assert.match(audiencePage, /CSV structuré pour démarrer simplement/);
    assert.match(audiencePage, /CSV structuré pour projets et typologies/);
    assert.match(audiencePage, /Page agence et identité partenaire/);
    assert.match(audiencePage, /Page promoteur et identité partenaire/);
    assert.match(audiencePage, /Quels formats pouvez-vous intégrer/);
    assert.match(audiencePage, /Peut-on intégrer plusieurs projets et typologies/);
  });

  it("keeps the agency and promoter value propositions deliberately different", () => {
    assert.match(audiencePage, /L’agence vend un portefeuille et une expertise locale/);
    assert.match(audiencePage, /Le promoteur commercialise des projets, pas une simple liste d’annonces/);
    assert.match(audiencePage, /les biens disponibles, les secteurs couverts/);
    assert.match(audiencePage, /les programmes, les typologies, les plans/);
  });

  it("does not invent partner identities to fill the commercial proof sections", () => {
    assert.match(audiencePage, /Aperçu page agence/);
    assert.match(audiencePage, /Aperçu page promoteur/);
    assert.doesNotMatch(audiencePage, /Rabat Select Immobilier|Atlas Résidences/);
  });

  it("does not turn the richer sales pages into unsupported performance promises", () => {
    assert.match(audiencePage, /Aucun volume de leads, classement ou vente n’est garanti/);
    assert.match(audiencePage, /aucune promesse de volume de leads, de classement ou de vente/);
    assert.match(audiencePage, /ne crée ni badge, ni statut partenaire, ni publication automatique/);
  });

  it("keeps the canonical public professional profile fail-closed", () => {
    assert.match(professionalRepository, /\.eq\("validation_status", "validated"\)/);
    assert.match(professionalRepository, /\.eq\("public_visibility", "public"\)/);
    assert.match(professionalRepository, /commercialTierBadgeLabel/);
  });

  it("retires the legacy real-promoter path in favor of the canonical professional profile", () => {
    assert.match(legacyPromoterRoute, /redirect\(`\/professionnels\/\$\{slug\}`\)/);
    assert.match(legacyPromoterRoute, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(legacyPromoterRoute, /preview === "demo"/);
    assert.doesNotMatch(legacyPromoterRoute, /Promoteur partenaire AkarFinder/);
    assert.doesNotMatch(legacyPromoterRoute, /getActivePromoter|getActivePromoterProjects|getAllActivePromoterSlugs/);
    assert.doesNotMatch(legacyPromoterRepository, /getActivePromoter|getActivePromoterProjects|getAllActivePromoterSlugs/);
  });

  it("keeps local promoter fixtures demo-only and prevents visibility_status from granting partner truth", () => {
    assert.doesNotMatch(legacyPromoterData, /\n\s+visibility_status:\s*"active"/);
    assert.match(legacyPromoterRepository, /visibility_status === "demo"/);
    assert.doesNotMatch(legacyPromoterRepository, /visibility_status === "active"/);
  });
});

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

  it("keeps the canonical public professional profile fail-closed", () => {
    assert.match(professionalRepository, /\.eq\("validation_status", "validated"\)/);
    assert.match(professionalRepository, /\.eq\("public_visibility", "public"\)/);
    assert.match(professionalRepository, /commercialTierBadgeLabel/);
  });

  it("prevents a real promoter from being activated through the legacy local fixture while migration debt remains", () => {
    assert.doesNotMatch(legacyPromoterData, /\n\s+visibility_status:\s*"active"/);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { prepareProfessionalActivationRequest } from "../../../lib/professional/professional-activation-request.js";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 1 P1 — professional activation boundary", () => {
  it("normalizes public agency/promoter/exhibitor requests without creating an organization", () => {
    assert.deepEqual(
      prepareProfessionalActivationRequest({ requestedType: "agence", companyName: "Agence Atlas", city: "Rabat", requestedAddons: ["reporting", "reporting"] }),
      { requested_type: "agency", company_name: "Agence Atlas", city: "Rabat", requested_addons: ["reporting"] },
    );
    assert.equal(prepareProfessionalActivationRequest({ requestedType: "unknown", companyName: "X" }), null);
    assert.equal(prepareProfessionalActivationRequest({ requestedType: "promoteur", companyName: "" }), null);
  });

  it("persists a separate activation request and never inserts an anonymous professional organization", () => {
    const route = source("app/api/leads/route.ts");
    assert.ok(route.includes('.from("professional_activation_requests")'));
    assert.ok(route.includes("professional_activation_request_id"));
    assert.ok(route.includes("prepareProfessionalActivationRequest"));
    assert.equal(route.includes('.from("professional_organizations").insert'), false);
  });

  it("keeps activation requests private and conversion tied to a real organization", () => {
    const migration = source("supabase/migrations/20260723070000_professional_activation_requests_v1.sql");
    assert.ok(migration.includes("enable row level security"));
    assert.ok(migration.includes("revoke all on table public.professional_activation_requests from anon, authenticated"));
    assert.ok(migration.includes("to service_role"));
    assert.ok(migration.includes("organization_id uuid references public.professional_organizations"));
    assert.ok(migration.includes("status = 'converted' and organization_id is not null"));
  });
});

describe("Phase 1 P1 — Pro value proposition", () => {
  it("routes /pro through the data-for-value product page", () => {
    const page = source("app/pro/page.tsx");
    const v2 = source("components/pro/ProPageV2.tsx");
    assert.ok(page.includes("ProPageV2"));
    assert.ok(v2.includes("Contrat data-for-value"));
    assert.ok(v2.includes("Déclaré par le professionnel"));
    assert.ok(v2.includes("Calculé par AkarFinder"));
    assert.ok(v2.includes("Déduit avec prudence"));
    assert.ok(v2.includes("Non renseigné"));
    assert.equal(page.includes("Package Score"), false);
    assert.equal(page.includes("WhatsApp-first"), false);
    assert.equal(page.includes("MetricsStrip"), false);
  });

  it("uses one pilot foundation with separate agency and promoter journeys", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    const agency = source("app/pro/agences/page.tsx");
    const promoter = source("app/promoteurs/page.tsx");
    assert.ok(pro.includes('href="/pro/agences"'));
    assert.ok(pro.includes('href="/promoteurs"'));
    assert.ok(pro.includes("Socle Pro pilote"));
    assert.ok(pro.includes("Sponsoring labellisé"));
    assert.ok(agency.includes('audience="agency"'));
    assert.ok(promoter.includes('audience="promoter"'));
    assert.equal(promoter.includes("PromoteursPageShell"), false);
  });

  it("states that payment cannot buy organic relevance or trust", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    assert.ok(pro.includes("Le paiement n’achète pas la pertinence organique"));
    assert.ok(pro.includes("Toute visibilité sponsorisée est séparée et clairement labellisée"));
  });
});

describe("Phase 1 P1 — demo funnel", () => {
  it("condenses the demo hub to agency, promoter, and enriched property proof surfaces", () => {
    const demo = source("app/demo/page.tsx");
    assert.ok(demo.includes('/demo/agence'));
    assert.ok(demo.includes('/demo/promoteur'));
    assert.ok(demo.includes('/demo/bien'));
    assert.equal(demo.includes('/demo/acheter'), false);
    assert.equal(demo.includes('/demo/louer'), false);
    assert.equal(demo.includes('/demo/vendre'), false);
    assert.equal(demo.includes('/demo/demande'), false);
  });

  it("gives every demo a real exit to Pro activation", () => {
    const shell = source("components/demo/DemoShell.tsx");
    assert.ok(shell.includes('/pro#contact'));
    assert.ok(shell.includes("Découvrir AkarFinder Pro"));
  });
});

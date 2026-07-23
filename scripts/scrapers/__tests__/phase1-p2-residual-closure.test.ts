import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 1 P2 — residual UX closure", () => {
  it("closes all three residual audit IDs explicitly", () => {
    const ledger = source("docs/PHASE1_P2_CLOSURE_LEDGER.md");
    for (const id of ["009", "050", "077"]) {
      assert.ok(ledger.includes(`AF-AUDIT-P2-${id}`), `Missing P2 finding ${id}`);
    }
    assert.ok(ledger.includes("CLOSED_ALREADY"));
    assert.ok(ledger.includes("CLOSED"));
  });

  it("keeps the Home final CTA buyer-first and B2B subordinate", () => {
    const cta = source("components/landing/HomeFinalCTA.tsx");
    assert.ok(cta.includes('href="/search"'));
    assert.ok(cta.includes('href="/compagnon"'));
    assert.ok(cta.includes('href="/pro"'));
    assert.ok(cta.includes("Vous êtes une agence ou un promoteur ?"));
    assert.ok(cta.indexOf('href="/pro"') > cta.indexOf('href="/compagnon"'));
  });

  it("keeps seller success truthful and sends the user to coherent next actions", () => {
    const seller = source("components/vendre/SellerPropertyDraftForm.tsx");
    assert.ok(seller.includes("Brouillon du bien enregistré"));
    assert.ok(seller.includes("ni une annonce publiée, ni une vérification AkarFinder"));
    assert.ok(seller.includes('href="/vendre"'));
    assert.ok(seller.includes("Voir les offres comparables"));
    assert.ok(seller.includes("return `/search?${params.toString()}`"));
  });

  it("makes one canonical Pro entry discoverable on mobile and all professional paths discoverable in the footer", () => {
    const header = source("components/layout/SiteHeader.tsx");
    const footer = source("components/landing/SiteFooter.tsx");

    assert.ok(header.includes('{ href: "/pro", label: "Pro"'));
    assert.ok(header.includes("agences et promoteurs"));
    assert.ok(header.includes('pathname.startsWith("/promoteurs")'));

    assert.ok(footer.includes("Professionnels"));
    assert.ok(footer.includes('{ label: "AkarFinder Pro", href: "/pro" }'));
    assert.ok(footer.includes('{ label: "Agences", href: "/pro/agences" }'));
    assert.ok(footer.includes('{ label: "Promoteurs", href: "/promoteurs" }'));
  });
});

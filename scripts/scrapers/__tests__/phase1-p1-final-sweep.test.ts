import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const EXPECTED_P1 = [
  "002","003","004","005","006","007","008","010",
  "014","015","016","017","018","020","021","022","023",
  "026","027","029","031","032",
  "034","037","038","039","041","042","043","044","045","046","049",
  "053","054","055","056","057","059","060","061","062","064",
  "065","066","067","069","070","071","072","073","074","075","076","078",
] as const;

describe("Phase 1 P1 — exhaustive closure ledger", () => {
  const ledger = source("docs/PHASE1_P1_CLOSURE_LEDGER.md");

  it("contains every one of the 55 audited P1 findings exactly in the closure map", () => {
    assert.equal(EXPECTED_P1.length, 55);
    for (const id of EXPECTED_P1) {
      assert.ok(ledger.includes(`AF-AUDIT-P1-${id}`), `Missing AF-AUDIT-P1-${id}`);
    }
    const found = new Set([...ledger.matchAll(/AF-AUDIT-P1-(\d{3})/g)].map((match) => match[1]));
    assert.deepEqual([...found].sort(), [...EXPECTED_P1].sort());
  });

  it("keeps P2 and release-gated P0 explicitly outside P1 closure", () => {
    assert.ok(ledger.includes("P2 findings"));
    assert.ok(ledger.includes("`009`, `050`, `077`"));
    assert.ok(ledger.includes("AF-AUDIT-P0-001"));
    assert.ok(ledger.includes("011"));
    assert.ok(ledger.includes("012"));
    assert.ok(ledger.includes("013"));
  });
});

describe("Phase 1 P1 — final route and sitemap cleanup", () => {
  it("removes redirect-only legacy buyer profile from sitemap and gates neighborhood URLs", () => {
    const sitemap = source("app/sitemap.ts");
    assert.equal(sitemap.includes('/profil-recherche'), false);
    assert.ok(sitemap.includes("isSeoEligibleGeoPair"));
    assert.ok(sitemap.includes('/pro/agences'));
    assert.ok(sitemap.includes('/promoteurs'));
    assert.ok(sitemap.includes('/map'));
  });

  it("keeps old Search card intent hashes functional through canonical destinations", () => {
    const redirect = source("components/intent/LegacyIntentHashRedirect.tsx");
    const buy = source("app/acheter/page.tsx");
    const rent = source("app/louer/page.tsx");
    const credit = source("app/credit/page.tsx");
    assert.ok(redirect.includes('window.location.hash === "#alerte"'));
    assert.ok(redirect.includes('router.replace("/mon-projet")'));
    assert.ok(redirect.includes('window.location.hash === "#financement"'));
    assert.ok(redirect.includes('router.replace("/credit")'));
    assert.ok(buy.includes('LegacyIntentHashRedirect intent="buy"'));
    assert.ok(rent.includes('LegacyIntentHashRedirect intent="rent"'));
    assert.ok(credit.includes("CreditSimulator"));
    assert.ok(credit.includes("ni une offre de crédit"));
  });

  it("keeps legacy buyer and geo duplicate routes redirect-only", () => {
    assert.ok(source("app/profil-recherche/page.tsx").includes('redirect("/compagnon")'));
    assert.ok(source("app/quartiers/page.tsx").includes('permanentRedirect("/immobilier")'));
  });
});

describe("Phase 1 P1 — active B2B surfaces", () => {
  it("does not route active Pro or Promoter pages through retired proposition shells", () => {
    const pro = source("app/pro/page.tsx");
    const promoter = source("app/promoteurs/page.tsx");
    assert.ok(pro.includes("ProPageV2"));
    assert.equal(pro.includes("ProLeadForm"), false);
    assert.ok(promoter.includes("ProfessionalAudiencePage"));
    assert.equal(promoter.includes("PromoteursPageShell"), false);
  });
});

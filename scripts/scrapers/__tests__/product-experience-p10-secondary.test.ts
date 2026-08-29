import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const SECONDARY_PAGES = [
  "app/a-propos/page.tsx",
  "app/comment-ca-marche/page.tsx",
  "app/faq/page.tsx",
  "app/contact/page.tsx",
  "app/demande-retrait/page.tsx",
  "app/conditions-utilisation/page.tsx",
  "app/politique-confidentialite/page.tsx",
] as const;

describe("Product Experience P10 — secondary pages", () => {
  it("routes all seven public secondary pages through the common shell", () => {
    for (const path of SECONDARY_PAGES) {
      assert.ok(source(path).includes("SecondaryPageShell"), `${path} must use SecondaryPageShell`);
    }
  });

  it("keeps the secondary shell on the canonical AkarFinder chrome without duplicating the global mobile nav", () => {
    const shell = source("components/layout/SecondaryPageShell.tsx");
    const rootLayout = source("app/layout.tsx");
    assert.ok(shell.includes('data-secondary-page-shell="akarfinder-v1"'));
    assert.ok(shell.includes("<SiteHeader searchMode fluid />"));
    assert.ok(shell.includes("<SiteFooter />"));
    assert.ok(!shell.includes("<MobileBottomNav />"));
    assert.ok(rootLayout.includes("<MobileBottomNav />"));
    assert.ok(shell.includes('maxWidth === "3xl"'));
  });

  it("preserves the privacy policy content and withdrawal route", () => {
    const privacy = source("app/politique-confidentialite/page.tsx");
    for (const text of [
      "Données que nous ne collectons pas depuis les annonces",
      "Données que vous nous transmettez",
      "Cookies et mesure d&apos;audience",
      "Vos droits",
      'href="/demande-retrait"',
    ]) assert.ok(privacy.includes(text), `privacy policy missing ${text}`);
    assert.ok(privacy.includes('maxWidth="3xl"'));
  });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shellPages = [
  "app/a-propos/page.tsx",
  "app/comment-ca-marche/page.tsx",
  "app/faq/page.tsx",
  "app/contact/page.tsx",
  "app/conditions-utilisation/page.tsx",
  "app/demande-retrait/page.tsx",
  "app/credit/page.tsx",
];

test("UI-POLISH-P4 secondary public pages converge on the canonical shell", () => {
  const shell = fs.readFileSync("components/layout/SecondaryPageShell.tsx", "utf8");
  assert.match(shell, /SiteHeader searchMode fluid/);
  assert.match(shell, /MobileBottomNav/);
  assert.match(shell, /ui\.pageLight/);
  assert.match(shell, /ui\.surfacePremium/);
  assert.match(shell, /data-p4-secondary-shell/);

  for (const pagePath of shellPages) {
    const source = fs.readFileSync(pagePath, "utf8");
    assert.match(source, /SecondaryPageShell/, `${pagePath} must use SecondaryPageShell`);
    assert.doesNotMatch(source, /bronze/i, `${pagePath} must not reintroduce bronze styling`);
  }
});

test("P4 preserves purpose-built secondary routes that already meet their product contract", () => {
  const acheter = fs.readFileSync("app/acheter/page.tsx", "utf8");
  const accompagnement = fs.readFileSync("app/accompagnement/page.tsx", "utf8");
  const compagnon = fs.readFileSync("app/compagnon/page.tsx", "utf8");

  assert.match(acheter, /BuyIntentHubP1/);
  assert.match(accompagnement, /AccompagnementLeadForm/);
  assert.match(compagnon, /permanentRedirect\("\/mon-projet"\)/);
});

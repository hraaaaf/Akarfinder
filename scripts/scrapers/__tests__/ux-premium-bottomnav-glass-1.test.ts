import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-BOTTOMNAV-GLASS-1 canonical mockup contract", () => {
  const nav = fs.readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  const designSystem = fs.readFileSync("components/ui/design-system.ts", "utf8");
  const alerts = fs.readFileSync("app/alerts/page.tsx", "utf8");

  assert.match(nav, /data-premium-bottomnav="ux-premium-bottomnav-glass-1"/);
  assert.match(nav, /ui\.surfaceGlass/);
  assert.match(designSystem, /surfaceGlass:/);
  assert.match(designSystem, /backdrop-blur-\[20px\]/);
  assert.match(designSystem, /rounded-\[24px\]/);
  assert.match(designSystem, /bg-white\/80/);
  assert.match(nav, /h-\[66px\]/);

  for (const [href, label] of [
    ["/search", "Explorer"],
    ["/favorites", "Favoris"],
    ["/map", "Carte"],
    ["/alerts", "Alertes"],
    ["/mon-projet", "Compte"],
  ]) {
    assert.ok(nav.includes(`href: "${href}"`), `missing ${href}`);
    assert.ok(nav.includes(`label: "${label}"`), `missing ${label}`);
  }

  assert.doesNotMatch(nav, /href: "\/vendre"|label: "Publier"/);
  assert.doesNotMatch(nav, /href: "\/contact"|label: "Contact"/);
  const explorerBlock = nav.slice(nav.indexOf('href: "/search"'), nav.indexOf('href: "/favorites"'));
  assert.doesNotMatch(explorerBlock, /"\/map"/);
  assert.match(alerts, /Les notifications automatiques ne sont pas encore activées/);
  assert.match(alerts, /href="\/profil-recherche"/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-BOTTOMNAV-GLASS-1 canonical navigation contract", () => {
  const nav = fs.readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  const navigation = fs.readFileSync("lib/product-navigation.ts", "utf8");
  const designSystem = fs.readFileSync("components/ui/design-system.ts", "utf8");

  assert.match(nav, /data-premium-bottomnav="ux-premium-bottomnav-glass-1"/);
  assert.match(nav, /data-mobile-bottom-nav="p2-ia-v1"/);
  assert.match(nav, /ui\.surfaceGlass/);
  assert.match(designSystem, /surfaceGlass:/);
  assert.match(designSystem, /backdrop-blur-\[20px\]/);
  assert.match(designSystem, /rounded-\[28px\]/);
  assert.match(designSystem, /bg-white\/82/);
  assert.match(designSystem, /supports-\[backdrop-filter\]:bg-white\/76/);
  assert.match(nav, /h-\[66px\]/);

  for (const [href, label] of [
    ["/search", "Explorer"],
    ["/favorites", "Favoris"],
    ["/map", "Vivre ici"],
    ["/vendre", "Vendre"],
    ["/mon-projet", "Mon Projet"],
  ]) {
    assert.ok(navigation.includes(`href: "${href}"`), `missing ${href}`);
    assert.ok(navigation.includes(`label: "${label}"`), `missing ${label}`);
  }

  assert.doesNotMatch(navigation, /href: "\/alerts"|label: "Alertes"/);
  assert.doesNotMatch(nav, /href: "\/contact"|label: "Contact"/);
});

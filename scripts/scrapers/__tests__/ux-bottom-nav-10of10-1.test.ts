import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const nav = source("components/layout/MobileBottomNav.tsx");
const navigation = source("lib/product-navigation.ts");
const designSystem = source("components/ui/design-system.ts");
const layout = source("app/layout.tsx");
const secondaryShell = source("components/layout/SecondaryPageShell.tsx");

test("UX-BOTTOM-NAV remains the one global mobile navigation", () => {
  assert.match(layout, /import \{ MobileBottomNav \} from "@\/components\/layout\/MobileBottomNav"/);
  assert.match(layout, /<MobileBottomNav \/>/);
  assert.doesNotMatch(secondaryShell, /MobileBottomNav/);
  assert.match(nav, /aria-label="Navigation mobile"/);
  assert.match(nav, /md:hidden/);
  assert.doesNotMatch(nav, /lg:hidden/);
});

test("UX-BOTTOM-NAV uses the canonical floating AkarFinder glass language", () => {
  assert.match(nav, /data-mobile-bottom-nav="p2-ia-v1"/);
  assert.match(nav, /data-premium-bottomnav="ux-premium-bottomnav-glass-1"/);
  assert.match(nav, /data-theme="light"/);
  assert.match(nav, /ui\.surfaceGlass/);
  assert.match(designSystem, /surfaceGlass:/);
  assert.match(designSystem, /bg-white\/82/);
  assert.match(designSystem, /supports-\[backdrop-filter\]:bg-white\/76/);
  assert.match(designSystem, /backdrop-blur-\[20px\]/);
  assert.match(designSystem, /rounded-\[28px\]/);
  assert.match(designSystem, /#0B2545/);
  assert.match(nav, /#0B63CE/);
  assert.match(nav, /#0B2545/);
  assert.doesNotMatch(designSystem, /#F97316|249,115,22|orange|bronze/i);
});

test("UX-BOTTOM-NAV exposes the five approved utility destinations", () => {
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

test("UX-BOTTOM-NAV derives active state accessibly", () => {
  assert.match(nav, /^"use client";/);
  assert.match(nav, /usePathname/);
  assert.match(nav, /activePrefixes\.some/);
  assert.match(nav, /matchesPath\(pathname, prefix\)/);
  assert.match(nav, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(nav, /data-mobile-bottom-nav-active=\{isActive \? "true" : "false"\}/);
  assert.match(nav, /focus-visible:ring-2/);
});

test("UX-BOTTOM-NAV keeps touch and floating geometry explicit", () => {
  assert.match(nav, /h-\[66px\]/);
  assert.match(nav, /left-\[10px\]/);
  assert.match(nav, /right-\[10px\]/);
  assert.match(nav, /bottom-\[calc\(8px\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(nav, /min-h-11/);
  assert.match(layout, /pb-\[calc\(64px\+env\(safe-area-inset-bottom\)\)\] md:pb-0/);
});

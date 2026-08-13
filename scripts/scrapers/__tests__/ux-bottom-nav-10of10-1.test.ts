import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const nav = source("components/layout/MobileBottomNav.tsx");
const layout = source("app/layout.tsx");
const alerts = source("app/alerts/page.tsx");

test("UX-BOTTOM-NAV remains the one global mobile navigation", () => {
  assert.match(layout, /import \{ MobileBottomNav \} from "@\/components\/layout\/MobileBottomNav"/);
  assert.match(layout, /<MobileBottomNav \/>/);
  assert.match(nav, /aria-label="Navigation mobile"/);
  assert.match(nav, /md:hidden/);
  assert.doesNotMatch(nav, /lg:hidden/);
});

test("UX-BOTTOM-NAV uses the canonical floating AkarFinder glass language", () => {
  assert.match(nav, /data-mobile-bottom-nav="exact-light-blue"/);
  assert.match(nav, /data-premium-bottomnav="ux-premium-bottomnav-glass-1"/);
  assert.match(nav, /data-theme="light"/);
  assert.match(nav, /bg-white\/80/);
  assert.match(nav, /backdrop-blur-\[20px\]/);
  assert.match(nav, /rounded-\[24px\]/);
  assert.match(nav, /#0B63CE/);
  assert.match(nav, /#0B2545/);
  assert.doesNotMatch(nav, /#F97316|249,115,22|orange|bronze/i);
});

test("UX-BOTTOM-NAV exposes the five destinations locked by the canonical mockup", () => {
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

test("UX-BOTTOM-NAV keeps touch, floating geometry and truthful Alerts explicit", () => {
  assert.match(nav, /h-\[66px\]/);
  assert.match(nav, /left-\[10px\]/);
  assert.match(nav, /right-\[10px\]/);
  assert.match(nav, /bottom-\[calc\(8px\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(nav, /min-h-11/);
  assert.match(layout, /pb-\[calc\(64px\+env\(safe-area-inset-bottom\)\)\] md:pb-0/);
  assert.match(alerts, /Les notifications automatiques ne sont pas encore activées/);
  assert.match(alerts, /href="\/profil-recherche"/);
});

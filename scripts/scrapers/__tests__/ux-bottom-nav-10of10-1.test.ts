import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const nav = source("components/layout/MobileBottomNav.tsx");
const layout = source("app/layout.tsx");

test("UX-BOTTOM-NAV is one existing global mobile navigation, not a Search-only duplicate", () => {
  assert.match(layout, /import \{ MobileBottomNav \} from "@\/components\/layout\/MobileBottomNav"/);
  assert.match(layout, /<MobileBottomNav \/>/);
  assert.match(nav, /aria-label="Navigation mobile"/);
  assert.match(nav, /md:hidden/);
  assert.doesNotMatch(nav, /lg:hidden/);
});

test("UX-BOTTOM-NAV uses the AkarFinder light blue visual language with no orange or bronze", () => {
  assert.match(nav, /data-mobile-bottom-nav="exact-light-blue"/);
  assert.match(nav, /data-theme="light"/);
  assert.match(nav, /bg-white/);
  assert.match(nav, /#0B63CE/);
  assert.match(nav, /#0B2545/);
  assert.doesNotMatch(nav, /#F97316|249,115,22|orange|bronze/i);
});

test("UX-BOTTOM-NAV exposes five honest persistent destinations", () => {
  for (const contract of [
    ['href: "/search"', 'label: "Explorer"'],
    ['href: "/favorites"', 'label: "Favoris"'],
    ['href: "/vendre"', 'label: "Publier"'],
    ['href: "/contact"', 'label: "Contact"'],
    ['href: "/mon-projet"', 'label: "Compte"'],
  ]) {
    assert.ok(nav.includes(contract[0]), `missing ${contract[0]}`);
    assert.ok(nav.includes(contract[1]), `missing ${contract[1]}`);
  }
  assert.doesNotMatch(nav, /label: "Ajouter"|label: "Messages"/);
});

test("UX-BOTTOM-NAV derives active state from pathname and exposes accessible current-page semantics", () => {
  assert.match(nav, /^"use client";/);
  assert.match(nav, /usePathname/);
  assert.match(nav, /activePrefixes\.some/);
  assert.match(nav, /matchesPath\(pathname, prefix\)/);
  assert.match(nav, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(nav, /data-mobile-bottom-nav-active=\{isActive \? "true" : "false"\}/);
  assert.match(nav, /focus-visible:ring-2/);
});

test("UX-BOTTOM-NAV keeps touch, safe-area and page-bottom geometry explicit", () => {
  assert.match(nav, /h-16/);
  assert.match(nav, /min-h-11/);
  assert.match(nav, /pb-\[env\(safe-area-inset-bottom\)\]/);
  assert.match(layout, /pb-\[calc\(64px\+env\(safe-area-inset-bottom\)\)\] md:pb-0/);
});

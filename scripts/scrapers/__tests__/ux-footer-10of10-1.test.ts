import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const footer = source("components/landing/SiteFooter.tsx");
const searchPage = source("app/search/page.tsx");
const homePage = source("app/page.tsx");

test("UX-FOOTER isolates the dense footer to Search and preserves the default landing footer", () => {
  assert.match(footer, /variant\?: "default" \| "search"/);
  assert.match(footer, /variant = "default"/);
  assert.match(searchPage, /<SiteFooter variant="search" \/>/);
  assert.match(homePage, /<SiteFooter \/>/);
  assert.match(footer, /data-search-footer=\{isSearch \? "compact" : undefined\}/);
  assert.match(footer, /py-12 text-white sm:py-14 lg:py-16/);
});

test("UX-FOOTER keeps Search compact, blue-white and accessible", () => {
  assert.match(footer, /py-7 text-white sm:py-8 lg:py-8/);
  assert.match(footer, /h-8 w-auto sm:h-9/);
  assert.match(footer, /min-h-11/);
  assert.match(footer, /focus-visible:ring-2/);
  assert.match(footer, /#4B9BFF/);
  assert.match(footer, /#041426/);
  assert.doesNotMatch(footer, /#F97316|249,115,22|orange|bronze/i);
});

test("UX-FOOTER exposes only explicit internal destinations and keeps legal/trust disclosure", () => {
  const hrefs = [
    "/acheter",
    "/louer",
    "/neuf",
    "/map",
    "/compare",
    "/a-propos",
    "/comment-ca-marche",
    "/faq",
    "/contact",
    "/pro",
    "/pro/agences",
    "/promoteurs",
    "/demande-retrait",
    "/conditions-utilisation",
    "/politique-confidentialite",
  ];

  for (const href of hrefs) assert.ok(footer.includes(`href: "${href}"`), `missing ${href}`);
  assert.doesNotMatch(footer, /href:\s*"#|href:\s*"https?:\/\//);
  assert.match(footer, /© 2026 AkarFinder\.ma/);
  assert.match(footer, /Les sources et le niveau d&apos;information restent visibles pour chaque résultat\./);
  assert.match(footer, /data-footer-trust-line/);
});

test("UX-FOOTER keeps mobile information architecture collapsed and touch-safe", () => {
  assert.match(footer, /data-footer-mobile-group/);
  assert.match(footer, /divide-y divide-white\/10 border-y border-white\/10 sm:hidden/);
  assert.match(footer, /hidden gap-7 sm:grid sm:grid-cols-3/);
  assert.match(footer, /flex min-h-11 items-center/);
  assert.match(footer, /group-open:rotate-45/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { buildPublicPageMetadata } from "../../../lib/seo/public-page-metadata.js";
import { siteConfig } from "../../../lib/seo/site.js";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const staticRoutes = [
  "/acheter",
  "/louer",
  "/neuf",
  "/vendre",
  "/pro",
  "/pro/agences",
  "/promoteurs",
  "/immobilier",
  "/map",
] as const;

test("public metadata builder emits self-referencing canonical and matching OpenGraph URL", () => {
  const metadata = buildPublicPageMetadata({
    title: "Acheter au Maroc — AkarFinder",
    description: "Description test",
    canonicalPath: "/acheter",
  });
  const expected = `${siteConfig.siteUrl}/acheter`;
  assert.equal(metadata.alternates?.canonical, expected);
  assert.equal(metadata.openGraph?.url, expected);
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("root layout no longer leaks Home canonical or social metadata into child routes", () => {
  const source = read("app/layout.tsx");
  assert.doesNotMatch(source, /alternates\s*:\s*\{\s*canonical\s*:\s*["']\/["']/);
  assert.doesNotMatch(source, /\n\s*openGraph\s*:/);
  assert.doesNotMatch(source, /\n\s*twitter\s*:/);
});

test("home owns its canonical explicitly", () => {
  const source = read("app/page.tsx");
  assert.match(source, /buildPublicPageMetadata/);
  assert.match(source, /canonicalPath:\s*["']\/["']/);
});

test("every static sitemap route owns route-specific canonical metadata", () => {
  const sitemap = read("app/sitemap.ts");
  for (const route of staticRoutes) {
    assert.match(sitemap, new RegExp(`["']${route.replace(/\//g, "\\/")}["']`), `sitemap:${route}`);
    const layoutPath = `app/${route.slice(1)}/layout.tsx`;
    const source = read(layoutPath);
    assert.match(source, /buildPublicPageMetadata/, layoutPath);
    assert.ok(source.includes(`canonicalPath: "${route}"`), `${layoutPath}:canonical`);
  }
});

test("dynamic city and district pages retain their own generated canonicals", () => {
  assert.match(read("app/immobilier/[city]/page.tsx"), /alternates:\s*\{ canonical: seo\.canonical \}/);
  assert.match(read("app/immobilier/[city]/[district]/page.tsx"), /alternates:\s*\{ canonical: seo\.canonical \}/);
});

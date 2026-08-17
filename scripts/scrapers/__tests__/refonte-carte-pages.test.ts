import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const matrix = fs.readFileSync(path.join(root, "docs", "refonte-carte-pages.md"), "utf8");

function collectPages(dir: string): string[] {
  const pages: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (absolute === path.join(root, "app", "api")) continue;
      pages.push(...collectPages(absolute));
      continue;
    }
    if (entry.isFile() && entry.name === "page.tsx") pages.push(absolute);
  }
  return pages;
}

function pagePathToRoute(file: string): string {
  const relativeDir = path.relative(path.join(root, "app"), path.dirname(file));
  if (!relativeDir) return "/";

  const segments = relativeDir
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => !segment.startsWith("@"));

  return `/${segments.join("/")}`;
}

const auditedRoutes = [...new Set(collectPages(path.join(root, "app")).map(pagePathToRoute))].sort();

test("every real app UI page has an explicit premium reference", () => {
  const missing = auditedRoutes.filter((route) => !matrix.includes(`\`${route}\``));
  assert.deepEqual(missing, [], `missing route references: ${missing.join(", ")}`);
});

test("route inventory is substantial and source-derived", () => {
  assert.ok(auditedRoutes.length >= 30, `unexpectedly small UI route inventory: ${auditedRoutes.length}`);
  assert.ok(auditedRoutes.includes("/"));
  assert.ok(auditedRoutes.includes("/search"));
});

test("dynamic page families and visual proof are locked", () => {
  for (const marker of ["Fiche annonce dynamique", "Fiche quartier dynamique", "Fiche promoteur / projet dynamique", "Definition of Done par page"]) {
    assert.ok(matrix.includes(marker), `missing page-family marker: ${marker}`);
  }
  assert.ok(matrix.includes("capture avant"));
  assert.ok(matrix.includes("capture après"));
  assert.ok(matrix.includes("aucun déploiement Vercel sans autorisation explicite"));
});

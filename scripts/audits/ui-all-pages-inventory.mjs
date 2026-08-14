import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appDir = path.resolve("app");
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-all-pages-inventory");

const expectedContinuity401 = [{ path: "/api/me/continuity", status: 401 }];

const dynamicAuditByPattern = new Map([
  ["/listings/[id]", {
    fixtureUrl: null,
    auditMode: "data-fixture-required",
    blocker: "No deterministic local listing id is guaranteed: the page requires a database-backed listing visible under the current source-access registry.",
  }],
  ["/immobilier/[city]", { fixtureUrl: "/immobilier/rabat", auditMode: "render" }],
  ["/immobilier/[city]/[district]", { fixtureUrl: "/immobilier/rabat/agdal", auditMode: "render" }],
  ["/quartiers/[citySlug]/[neighborhoodSlug]", { fixtureUrl: "/quartiers/rabat/agdal", auditMode: "render" }],
  ["/projets/[slug]", { fixtureUrl: "/projets/residence-demo-akarfinder?preview=demo", auditMode: "render-demo" }],
  ["/promoteurs/[slug]", { fixtureUrl: "/promoteurs/promoteur-demo-akarfinder?preview=demo", auditMode: "render-demo" }],
  ["/professionnels/[slug]", {
    fixtureUrl: null,
    auditMode: "data-fixture-required",
    blocker: "No deterministic local public professional exists: the page requires a validated + public professional_organizations row.",
  }],
]);

const staticAuditByPattern = new Map([
  ["/compagnon", { expectedFinalPath: "/mon-projet", expectedResourceFailures: expectedContinuity401 }],
  ["/onboarding", { expectedFinalPath: "/mon-projet", expectedResourceFailures: expectedContinuity401 }],
  ["/profil-recherche", { expectedFinalPath: "/mon-projet", expectedResourceFailures: expectedContinuity401 }],
  ["/mon-projet", { expectedResourceFailures: expectedContinuity401 }],
  ["/mon-projet/espace", { expectedResourceFailures: expectedContinuity401 }],
  ["/pro/leads", { expectedFinalPath: "/pro" }],
  ["/quartiers", { expectedFinalPath: "/immobilier" }],
]);

async function collectPageFiles(dir, relative = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await collectPageFiles(path.join(dir, entry.name), nextRelative));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      files.push(nextRelative);
    }
  }
  return files;
}

function fileToRoutePattern(file) {
  const withoutPage = file === "page.tsx" ? "" : file.replace(/\/page\.tsx$/, "");
  return withoutPage ? `/${withoutPage}` : "/";
}

function isDynamicRoute(routePattern) {
  return routePattern.split("/").some((segment) => segment.startsWith("[") && segment.endsWith("]"));
}

function routeFamily(routePattern) {
  if (routePattern.startsWith("/demo")) return "demo";
  if (routePattern.startsWith("/visual-qa")) return "visual-qa";
  if (routePattern.startsWith("/pro")) return "pro";
  if (routePattern.startsWith("/listings/")) return "listing-detail";
  if (routePattern.startsWith("/immobilier")) return "seo-geo";
  if (routePattern.startsWith("/quartiers")) return "neighborhood";
  if (routePattern === "/") return "home";
  return "public";
}

const pageFiles = (await collectPageFiles(appDir)).sort();
const pages = pageFiles.map((sourcePath) => {
  const routePattern = fileToRoutePattern(sourcePath);
  const dynamic = isDynamicRoute(routePattern);
  const dynamicAudit = dynamic ? dynamicAuditByPattern.get(routePattern) ?? null : null;
  const staticAudit = !dynamic ? staticAuditByPattern.get(routePattern) ?? null : null;
  return {
    sourcePath: `app/${sourcePath}`,
    routePattern,
    dynamic,
    fixtureUrl: dynamic ? dynamicAudit?.fixtureUrl ?? null : routePattern,
    auditMode: dynamic ? dynamicAudit?.auditMode ?? null : "render",
    blocker: dynamicAudit?.blocker ?? null,
    family: routeFamily(routePattern),
    expectedFinalPath: staticAudit?.expectedFinalPath ?? null,
    expectedResourceFailures: staticAudit?.expectedResourceFailures ?? [],
  };
});

const unclassifiedDynamic = pages.filter((page) => page.dynamic && !page.auditMode);
const dataBlocked = pages.filter((page) => page.auditMode === "data-fixture-required");
const duplicateRoutes = Object.entries(
  pages.reduce((acc, page) => {
    acc[page.routePattern] = (acc[page.routePattern] ?? 0) + 1;
    return acc;
  }, {}),
).filter(([, count]) => count > 1);

const report = {
  schemaVersion: "UI_ALL_PAGES_INVENTORY_V2",
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  dynamicPageCount: pages.filter((page) => page.dynamic).length,
  staticPageCount: pages.filter((page) => !page.dynamic).length,
  renderablePageCount: pages.filter((page) => Boolean(page.fixtureUrl)).length,
  dataBlockedPageCount: dataBlocked.length,
  unclassifiedDynamicCount: unclassifiedDynamic.length,
  duplicateRouteCount: duplicateRoutes.length,
  pages,
  dataBlocked,
  unclassifiedDynamic,
  duplicateRoutes,
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  pageCount: report.pageCount,
  staticPageCount: report.staticPageCount,
  dynamicPageCount: report.dynamicPageCount,
  renderablePageCount: report.renderablePageCount,
  dataBlocked: dataBlocked.map((page) => page.routePattern),
  unclassifiedDynamic: unclassifiedDynamic.map((page) => page.routePattern),
}, null, 2));

if (duplicateRoutes.length > 0) {
  throw new Error(`Duplicate App Router page patterns: ${duplicateRoutes.map(([route]) => route).join(", ")}`);
}
if (unclassifiedDynamic.length > 0) {
  throw new Error(`Dynamic page classification required: ${unclassifiedDynamic.map((page) => page.routePattern).join(", ")}`);
}

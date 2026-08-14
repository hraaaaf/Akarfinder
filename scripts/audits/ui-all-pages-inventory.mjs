import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appDir = path.resolve("app");
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "data/audits/ui-all-pages-inventory");

const fixtureByPattern = new Map([
  ["/listings/[id]", "/listings/casablanca-finance-city-terrasse"],
  ["/immobilier/[city]", "/immobilier/rabat"],
  ["/immobilier/[city]/[district]", "/immobilier/rabat/agdal"],
  ["/quartiers/[citySlug]/[neighborhoodSlug]", "/quartiers/rabat/agdal"],
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
  return {
    sourcePath: `app/${sourcePath}`,
    routePattern,
    dynamic,
    fixtureUrl: dynamic ? fixtureByPattern.get(routePattern) ?? null : routePattern,
    family: routeFamily(routePattern),
  };
});

const unresolvedDynamic = pages.filter((page) => page.dynamic && !page.fixtureUrl);
const duplicateRoutes = Object.entries(
  pages.reduce((acc, page) => {
    acc[page.routePattern] = (acc[page.routePattern] ?? 0) + 1;
    return acc;
  }, {}),
).filter(([, count]) => count > 1);

const report = {
  schemaVersion: "UI_ALL_PAGES_INVENTORY_V1",
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  dynamicPageCount: pages.filter((page) => page.dynamic).length,
  staticPageCount: pages.filter((page) => !page.dynamic).length,
  unresolvedDynamicCount: unresolvedDynamic.length,
  duplicateRouteCount: duplicateRoutes.length,
  pages,
  unresolvedDynamic,
  duplicateRoutes,
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  pageCount: report.pageCount,
  staticPageCount: report.staticPageCount,
  dynamicPageCount: report.dynamicPageCount,
  unresolvedDynamic: unresolvedDynamic.map((page) => page.routePattern),
}, null, 2));

if (duplicateRoutes.length > 0) {
  throw new Error(`Duplicate App Router page patterns: ${duplicateRoutes.map(([route]) => route).join(", ")}`);
}
if (unresolvedDynamic.length > 0) {
  throw new Error(`Dynamic page fixtures required: ${unresolvedDynamic.map((page) => page.routePattern).join(", ")}`);
}

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const registry = read("lib/map/premium-map-city-registry.ts");
const client = read("components/map/MapNeighborhoodClient.tsx");
const geoApiEntries = fs.readdirSync(path.join(root, "app/api/geo"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const casaRoute = read("app/api/geo/casablanca-arrondissements/route.ts");
const casaAudit = JSON.parse(read("data/geo/casablanca-arrondissements-osm.audit.json"));
const authorityEvidence = JSON.parse(read("data/geo/p1b13-priority-authority-evidence.json"));

const expectedCities = ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"];
for (const slug of expectedCities) {
  if (!registry.includes(`slug: \"${slug}\"`)) throw new Error(`missing premium city registry row: ${slug}`);
}

const providerRows = registry
  .split("\n")
  .filter((line) => line.includes("marketIntelligenceProvider:") && line.includes("slug:"));
const enabledProviders = providerRows.filter((line) => !line.includes("marketIntelligenceProvider: null"));
if (enabledProviders.length !== 1 || !enabledProviders[0].includes('slug: "rabat"') || !enabledProviders[0].includes('"rabat-market-intelligence"')) {
  throw new Error(`Rabat must remain the sole certified market-intelligence provider; got ${enabledProviders.join(" | ")}`);
}

if (!geoApiEntries.includes("casablanca-arrondissements")) throw new Error("missing Casablanca territorial endpoint");
if (!geoApiEntries.includes("rabat-market-intelligence")) throw new Error("missing Rabat market-intelligence endpoint");
for (const slug of ["casablanca", "marrakech", "tanger", "agadir", "fes"]) {
  if (geoApiEntries.includes(`${slug}-market-intelligence`)) throw new Error(`unexpected unvalidated market-intelligence endpoint: ${slug}`);
}

for (const token of ["decideCasablancaGeometryCanary", 'status: "disabled"', 'status: 404', '"X-AkarFinder-Geometry-Status": "preview-canary-1percent"']) {
  if (!casaRoute.includes(token)) throw new Error(`Casablanca canary contract missing token: ${token}`);
}

if (casaAudit.status !== "passed" || casaAudit.featureCount !== 16 || casaAudit.uniqueCanonicalCount !== 16 || casaAudit.allTopologiesValid !== true || casaAudit.publicationStatus !== "shadow") {
  throw new Error("Casablanca geometry audit contract is not the certified 16-feature shadow dataset");
}

const marrakechPairs = authorityEvidence.pairs.filter((pair) => pair.city === "Marrakech");
if (marrakechPairs.length < 2) throw new Error("Marrakech authority evidence cohort unexpectedly missing");
if (marrakechPairs.some((pair) => pair.registry_write_authorized_in_p1b13 !== false)) {
  throw new Error("Marrakech evidence unexpectedly authorizes registry writes");
}

for (const token of [
  'data-akarfinder-generic-map-selected=',
  '[data-akarfinder-generic-map-selected="true"] > aside[aria-label="Légende de la carte immobilière"]',
  'bottom: 84px !important',
]) {
  if (!client.includes(token)) throw new Error(`generic selected-district visual guard missing token: ${token}`);
}

console.log(JSON.stringify({
  ok: true,
  cities: expectedCities,
  marketIntelligenceProvider: "rabat-market-intelligence",
  casablanca: { geometryStatus: "shadow/canary", featureCount: casaAudit.featureCount, marketIntelligence: false },
  failClosed: ["marrakech", "tanger", "agadir", "fes"],
  selectedDistrictOverlayGuard: true,
}, null, 2));

import { readFile } from "node:fs/promises";

const registry = await readFile("lib/map/premium-map-city-registry.ts", "utf8");
const client = await readFile("components/map/MapNeighborhoodClient.tsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expected = [
  ["casablanca", "Casablanca", false],
  ["rabat", "Rabat", true],
  ["marrakech", "Marrakech", false],
  ["tanger", "Tanger", false],
  ["agadir", "Agadir", false],
  ["fes", "Fès", false],
];

for (const [slug, displayName, marketIntelligence] of expected) {
  assert(registry.includes(`slug: "${slug}"`), `missing premium city ${slug}`);
  assert(registry.includes(`displayName: "${displayName}"`), `display name mismatch ${slug}`);
  const row = registry.split("\n").find((line) => line.includes(`slug: "${slug}"`));
  assert(row, `row missing ${slug}`);
  assert(row.includes(`marketIntelligence: ${marketIntelligence}`), `capability mismatch ${slug}`);
}

const rows = registry.split("\n").filter((line) => line.includes("marketIntelligence:") && line.includes("slug:"));
assert(rows.length === 6, `expected 6 city capability rows, got ${rows.length}`);
assert(rows.filter((line) => line.includes("marketIntelligence: true")).length === 1, "only one city may be data-rich before Lot 8 providers are proven");
assert(rows.find((line) => line.includes('slug: "rabat"'))?.includes("marketIntelligence: true"), "Rabat must remain the only certified market-intelligence city");

assert(client.includes('from "@/lib/map/premium-map-city-registry"'), "MapNeighborhoodClient must consume premium city registry");
assert(client.includes("hasPremiumMarketIntelligence(navigationState.city)"), "MapNeighborhoodClient must route through capability contract");
assert(!client.includes('navigationState.city === "rabat"'), "direct Rabat routing must not bypass capability registry");

console.log(JSON.stringify({ ok: true, cities: expected.length, marketIntelligenceCities: ["rabat"] }, null, 2));

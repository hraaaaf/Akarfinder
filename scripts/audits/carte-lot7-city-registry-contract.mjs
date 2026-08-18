import { readFile } from "node:fs/promises";

const registry = await readFile("lib/map/premium-map-city-registry.ts", "utf8");
const client = await readFile("components/map/MapNeighborhoodClient.tsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expected = [
  ["casablanca", "Casablanca", "null"],
  ["rabat", "Rabat", '"rabat-market-intelligence"'],
  ["marrakech", "Marrakech", "null"],
  ["tanger", "Tanger", "null"],
  ["agadir", "Agadir", "null"],
  ["fes", "Fès", "null"],
];

const rows = registry.split("\n").filter((line) => line.includes("marketIntelligenceProvider:") && line.includes("slug:"));
assert(rows.length === 6, `expected 6 city capability rows, got ${rows.length}`);

for (const [slug, displayName, provider] of expected) {
  const row = rows.find((line) => line.includes(`slug: "${slug}"`));
  assert(row, `row missing ${slug}`);
  assert(row.includes(`displayName: "${displayName}"`), `display name mismatch ${slug}`);
  assert(row.includes(`marketIntelligenceProvider: ${provider}`), `provider mismatch ${slug}`);
}

assert(rows.filter((line) => !line.includes("marketIntelligenceProvider: null")).length === 1, "only one city may have an intelligence provider before Lot 8 providers are proven");
assert(rows.find((line) => line.includes('slug: "rabat"'))?.includes('marketIntelligenceProvider: "rabat-market-intelligence"'), "Rabat must retain its certified provider");

assert(client.includes('from "@/lib/map/premium-map-city-registry"'), "MapNeighborhoodClient must consume premium city registry");
assert(client.includes("getPremiumMarketIntelligenceProvider(navigationState.city)"), "MapNeighborhoodClient must resolve an explicit provider");
assert(client.includes('marketIntelligenceProvider === "rabat-market-intelligence"'), "Rabat provider must route explicitly to the Rabat experience");
assert(!client.includes('navigationState.city === "rabat"'), "direct Rabat routing must not bypass provider registry");

console.log(JSON.stringify({ ok: true, cities: expected.length, marketIntelligenceProviders: ["rabat-market-intelligence"] }, null, 2));

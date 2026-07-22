#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryUniverseV2 } from "../../lib/openserp-ingestion/query-universe-v2";

const universe = buildQueryUniverseV2();
const outputPath = join(process.cwd(), "data/openserp/query-universe-v1.json");
writeFileSync(outputPath, JSON.stringify(universe), "utf8");
console.log(JSON.stringify({
  universe_version: universe.universe_version,
  total_queries: universe.total_queries,
  cities_covered: universe.cities_covered,
  districts_covered: universe.districts_covered,
}, null, 2));

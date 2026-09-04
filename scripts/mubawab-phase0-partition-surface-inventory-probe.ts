import fs from "node:fs";
import path from "node:path";

import { extractPartitionSurfaceInventory } from "../data-ingestion/sources/mubawab/partition-surface-inventory";
import { extractListingRefs } from "../data-ingestion/sources/mubawab/discovery";
import { extractGeoHierarchyEvidence } from "../data-ingestion/sources/mubawab/geo-hierarchy";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html";

const URL = "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer";
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-partition-surface-inventory");
const OUT_FILE = path.join(OUT_DIR, "proof.json");

async function main() {
  const robotsAllowed = await isAllowedByRobots(URL);
  if (!robotsAllowed) throw new Error(`robots_disallowed:${URL}`);

  const response = await fetchHtml(URL, { timeoutMs: 20_000 });
  const inventory = extractPartitionSurfaceInventory(response.html, response.url);
  const hierarchy = extractGeoHierarchyEvidence(response.html, response.url);
  const refs = extractListingRefs(response.html, response.url);

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_partition_surface_inventory",
    safety: {
      theoretical_max_page_requests: 1,
      actual_page_requests: 1,
      robots_checked: true,
      detail_pages_opened: 0,
      disallowed_pagination_requests: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    page: {
      requested_url: URL,
      final_url: response.url,
      total_results: hierarchy.page_total_results,
      first_page_unit_ids: refs.length,
    },
    inventory,
    interpretation_rule: "Inventory only. No discovered route/control is promoted to an authorized partition until subset/disjointness/completeness is proven separately.",
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

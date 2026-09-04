import fs from "node:fs";
import path from "node:path";

import { assessAuthorizedLeaf, summarizeAuthorizedLeaves } from "../data-ingestion/sources/mubawab/authorized-traversal";
import { extractListingRefs } from "../data-ingestion/sources/mubawab/discovery";
import { extractGeoHierarchyEvidence } from "../data-ingestion/sources/mubawab/geo-hierarchy";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html";

const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-authorized-leaf-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");
const DELAY_MS = 2750;

const LEAVES = [
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-vendre",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/bureaux-et-commerces-a-vendre",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/bureaux-et-commerces-a-louer",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/locaux-a-vendre",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/locaux-a-louer",
  "https://www.mubawab.ma/fr/sd/casablanca/oasis/villas-et-maisons-de-luxe-a-vendre",
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceBlocked(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /^HTTP (403|429)\b/.test(message);
}

async function main() {
  const assessments = [];
  const requestedUrls: string[] = [];
  let blocked = false;

  for (let index = 0; index < LEAVES.length; index++) {
    const url = LEAVES[index];
    const allowed = await isAllowedByRobots(url);
    if (!allowed) {
      assessments.push(assessAuthorizedLeaf({
        url,
        family: "sd",
        total_results: null,
        first_page_unit_ids: [],
        robots_allowed: false,
      }));
      continue;
    }

    if (index > 0 && requestedUrls.length > 0) await sleep(DELAY_MS);

    try {
      const response = await fetchHtml(url, { timeoutMs: 20_000 });
      requestedUrls.push(url);
      const hierarchy = extractGeoHierarchyEvidence(response.html, response.url);
      const refs = extractListingRefs(response.html, response.url);
      assessments.push(assessAuthorizedLeaf({
        url: response.url,
        family: "sd",
        total_results: hierarchy.page_total_results,
        first_page_unit_ids: refs.map((ref) => ref.source_id),
        robots_allowed: true,
      }));
    } catch (error) {
      if (sourceBlocked(error)) {
        blocked = true;
        break;
      }
      assessments.push(assessAuthorizedLeaf({
        url,
        family: "sd",
        total_results: null,
        first_page_unit_ids: [],
        robots_allowed: true,
      }));
    }
  }

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_authorized_leaf_probe",
    safety: {
      theoretical_max_page_requests: LEAVES.length,
      actual_page_requests: requestedUrls.length,
      request_delay_ms: DELAY_MS,
      robots_checked_per_url: true,
      detail_pages_opened: 0,
      disallowed_pagination_requests: 0,
      source_blocked: blocked,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    scope: "Representative Oasis category x transaction leaves only; this quantifies P0-D mechanics and is not an exhaustive Morocco traversal.",
    requested_urls: requestedUrls,
    assessments,
    summary: summarizeAuthorizedLeaves(assessments),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (requestedUrls.length > LEAVES.length) throw new Error(`authorized_leaf_budget_exceeded:${requestedUrls.length}`);
  if (blocked) throw new Error("phase0_authorized_leaf_source_blocked");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

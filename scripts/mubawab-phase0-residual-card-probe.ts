import fs from "node:fs";
import path from "node:path";

import {
  extractListingCardSignals,
  reviewCardSemantics,
  type CardSemanticReview,
} from "../data-ingestion/sources/mubawab/listing-card-signals";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html";

type ResidualClassification = {
  control_id: string;
  control_family: string;
  absent_from_certified_union: string[];
};
type ResidualProof = { classifications: ResidualClassification[] };

const INPUT = path.resolve("data-ingestion/runs/mubawab/phase0-residual-classification/proof.json");
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-residual-card-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");
const DELAY_MS = 2750;

const CONTROL_URLS: Record<string, string> = {
  "ct-casablanca-rent": "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-louer",
  "is-casablanca-sale-cheap": "https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher",
  "is-casablanca-rent-cheap": "https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const residual = JSON.parse(fs.readFileSync(INPUT, "utf8")) as ResidualProof;
  const targets = residual.classifications.filter((item) => item.absent_from_certified_union.length > 0);

  const reviews: CardSemanticReview[] = [];
  const requestedUrls: string[] = [];
  const missingFromCurrentPage1 = new Set<string>();

  for (let index = 0; index < targets.length; index++) {
    const target = targets[index];
    const url = CONTROL_URLS[target.control_id];
    if (!url) throw new Error(`phase0_missing_control_url:${target.control_id}`);
    if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallow:${target.control_id}`);

    const response = await fetchHtml(url);
    requestedUrls.push(url);
    const byId = new Map(extractListingCardSignals(response.html, url).map((signal) => [signal.source_id, signal]));

    for (const sourceId of target.absent_from_certified_union) {
      const signal = byId.get(sourceId);
      if (!signal) {
        missingFromCurrentPage1.add(sourceId);
        continue;
      }
      reviews.push(reviewCardSemantics(signal));
    }

    if (index < targets.length - 1) await sleep(DELAY_MS);
  }

  const foundIds = new Set(reviews.map((item) => item.source_id));
  const allTargetIds = new Set(targets.flatMap((item) => item.absent_from_certified_union));
  for (const id of allTargetIds) if (!foundIds.has(id)) missingFromCurrentPage1.add(id);

  const clear = reviews.filter((item) => item.status === "clear");
  const ambiguous = reviews.filter((item) => item.status === "ambiguous_or_unmapped");

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_residual_card_probe",
    safety: {
      page1_requests: requestedUrls.length,
      theoretical_max_page_requests: 3,
      request_delay_ms: DELAY_MS,
      robots_checked: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    target_unique_ids: allTargetIds.size,
    found_on_current_page1: foundIds.size,
    missing_from_current_page1: missingFromCurrentPage1.size,
    clear_semantic_cards: clear.length,
    ambiguous_or_unmapped_cards: ambiguous.length,
    requested_urls: requestedUrls,
    clear_cards: clear,
    ambiguous_cards_for_human_gate: ambiguous,
    missing_source_ids: [...missingFromCurrentPage1],
    note: "Missing from current page 1 is expected when dynamic sorting moves a sampled listing. No disallowed pagination and no detail-page request is used to chase it.",
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

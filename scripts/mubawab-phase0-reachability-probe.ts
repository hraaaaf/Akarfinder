import fs from "node:fs";
import path from "node:path";
import { evaluateReachability, observeSurface, type ReachabilitySurface } from "../data-ingestion/sources/mubawab/reachability-proof";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html";

const DELAY_MS = 2750;
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-reachability-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");

const surfaces: ReachabilitySurface[] = [
  { id: "ct-casablanca-sale", family: "ct", role: "control", url: "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre" },
  { id: "ct-casablanca-rent", family: "ct", role: "control", url: "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-louer" },
  { id: "is-casablanca-sale-cheap", family: "is", role: "control", url: "https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher" },
  { id: "is-casablanca-rent-cheap", family: "is", role: "control", url: "https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher" },
  { id: "st-casablanca-apartment-sale", family: "st", role: "primary_harvest", url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre" },
  { id: "st-casablanca-apartment-rent", family: "st", role: "primary_harvest", url: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-louer" },
  { id: "st-casablanca-commercial-sale", family: "st", role: "primary_harvest", url: "https://www.mubawab.ma/fr/st/casablanca/locaux-a-vendre" },
  { id: "st-casablanca-commercial-rent", family: "st", role: "primary_harvest", url: "https://www.mubawab.ma/fr/st/casablanca/locaux-a-louer" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const observations = [];
  for (let index = 0; index < surfaces.length; index++) {
    const surface = surfaces[index];
    if (!(await isAllowedByRobots(surface.url))) throw new Error(`robots_disallow:${surface.id}`);
    const result = await fetchHtml(surface.url);
    observations.push(observeSurface(surface, result.html));
    if (index < surfaces.length - 1) await sleep(DELAY_MS);
  }

  const verdicts = evaluateReachability(observations);
  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_reachability_probe",
    safety: {
      surfaces: surfaces.length,
      theoretical_max_page_requests: surfaces.length,
      request_delay_ms: DELAY_MS,
      robots_checked: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    note: "A residual verdict means the sampled control IDs are not explained by this deliberately bounded primary sample. It does not by itself prove the control family is uniquely required; broader Phase 0 reachability must classify the residual IDs.",
    observations: observations.map((item) => ({
      id: item.id,
      family: item.family,
      role: item.role,
      url: item.url,
      unique_ids: item.unique_ids.length,
    })),
    verdicts,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

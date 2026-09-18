import fs from "node:fs";
import path from "node:path";

import {
  classifyResidualsAgainstKnownUnion,
  summarizeResidualClassification,
  type ReachabilityVerdictLike,
} from "../data-ingestion/sources/mubawab/residual-classifier";

type ReachabilityProof = { verdicts: ReachabilityVerdictLike[] };
type CatalogState = { version: number; source: string; seen_source_ids: string[] };

const REACHABILITY_PROOF = path.resolve("data-ingestion/runs/mubawab/phase0-reachability-probe/proof.json");
const CERTIFIED_STATE = path.resolve("data-ingestion/runs/mubawab/lot9-office-catalog-campaign/state.json");
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-residual-classification");
const OUT_FILE = path.join(OUT_DIR, "proof.json");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function main() {
  const reachability = readJson<ReachabilityProof>(REACHABILITY_PROOF);
  const state = readJson<CatalogState>(CERTIFIED_STATE);

  if (state.version !== 1 || state.source !== "mubawab") throw new Error("phase0_invalid_certified_state");
  if (state.seen_source_ids.length !== 31_731) {
    throw new Error(`phase0_expected_certified_union_31731_got_${state.seen_source_ids.length}`);
  }

  const classifications = classifyResidualsAgainstKnownUnion(reachability.verdicts, state.seen_source_ids);
  const summary = summarizeResidualClassification(classifications);

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_residual_classification_against_certified_union",
    certified_union_unique_ids: state.seen_source_ids.length,
    summary,
    classifications,
    decision_rule: {
      already_known_in_certified_union: "not a coverage gap; bounded page-order/sample artifact",
      absent_from_certified_union: "requires broader route classification; if semantic classification is ambiguous, stop for human arbitration before assigning a type",
    },
    safety: {
      live_requests: 0,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main();

import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";
import { readNeighborhoodPoiSnapshot } from "@/lib/neighborhood-context/poi-snapshot";
import {
  selectNeighborhoodAnchors,
  validateNeighborhoodAnchorSelection,
} from "@/lib/neighborhood-context/poi-assignment";

const DEFAULT_L1_SNAPSHOT = "artifacts/neighborhood-context-l1/snapshot.json";
const DEFAULT_OUTPUT_DIR = "artifacts/neighborhood-context-l2";

function geometryFor(city: string, neighborhood: string) {
  if (city !== "Casablanca") return null;
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find((entry) =>
    entry.displayName.localeCompare(neighborhood, "fr", { sensitivity: "base" }) === 0,
  ) ?? null;
}

async function main() {
  const l1Path = path.resolve(process.env.NCI_L2_L1_SNAPSHOT ?? DEFAULT_L1_SNAPSHOT);
  const outputDir = path.resolve(process.env.NCI_L2_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR);
  if (!fs.existsSync(l1Path)) throw new Error(`Missing L1 snapshot: ${l1Path}`);

  const raw = JSON.parse(fs.readFileSync(l1Path, "utf8"));
  const l1 = readNeighborhoodPoiSnapshot(raw, new Date(raw.generated_at));
  const selections = l1.pilots.map((pilot) => selectNeighborhoodAnchors(pilot, {
    geometry: geometryFor(pilot.city, pilot.neighborhood),
  }));

  const truthFindings: string[] = [];
  for (const selection of selections) {
    for (const error of validateNeighborhoodAnchorSelection(selection)) {
      truthFindings.push(`${selection.canonical_neighborhood_id}:${error}`);
    }
    for (const anchor of selection.anchors) {
      if (anchor.relation === "unresolved") {
        truthFindings.push(`${selection.canonical_neighborhood_id}:unresolved_anchor:${anchor.poi_id}`);
      }
      if (anchor.territorial_wording === "Dans le quartier" && anchor.relation !== "inside_certified_boundary") {
        truthFindings.push(`${selection.canonical_neighborhood_id}:false_inside:${anchor.poi_id}`);
      }
    }
  }

  const relations = selections.flatMap((selection) => selection.relations);
  const summary = {
    pilot_count: selections.length,
    ready_pilots: selections.filter((selection) => selection.status === "ready").length,
    partial_pilots: selections.filter((selection) => selection.status === "partial_context").length,
    insufficient_pilots: selections.filter((selection) => selection.status === "insufficient_context").length,
    total_anchors: selections.reduce((sum, selection) => sum + selection.anchors.length, 0),
    inside_relations: relations.filter((relation) => relation.relation === "inside_certified_boundary").length,
    authority_relations: relations.filter((relation) => relation.relation === "authority_linked").length,
    near_relations: relations.filter((relation) => relation.relation === "near_certified_reference").length,
    unresolved_relations: relations.filter((relation) => relation.relation === "unresolved").length,
  };

  const usefulPilots = summary.ready_pilots + summary.partial_pilots;
  const report = {
    schema: "NEIGHBORHOOD_CONTEXT_L2_PILOT_REPORT_V1",
    generated_at: new Date().toISOString(),
    ok: truthFindings.length === 0 && selections.length === 6 && usefulPilots >= 1 && summary.total_anchors >= 5,
    source_snapshot_generated_at: l1.generated_at,
    rules: {
      desired_anchor_range: [5, 8],
      max_per_category: 2,
      radius_is_not_boundary: true,
      shadow_geometry_is_not_certifying: true,
    },
    summary,
    truth_findings: truthFindings,
    pilots: selections,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});

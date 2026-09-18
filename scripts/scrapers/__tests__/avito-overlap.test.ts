import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAvitoCoverageManifest,
  parseAvitoSourceId,
} from "../../../data-ingestion/sources/avito/overlap";

test("Avito source ID is parsed only from Avito detail URLs", () => {
  assert.equal(
    parseAvitoSourceId("https://www.avito.ma/fr/tifelt/appartements/Appartement_a_vendre_57875516.htm"),
    "57875516",
  );
  assert.equal(parseAvitoSourceId("https://www.avito.ma/fr/tifelt/appartements/"), null);
  assert.equal(parseAvitoSourceId("https://example.com/fake_57875516.htm"), null);
  assert.equal(parseAvitoSourceId("not-a-url"), null);
});

test("Avito coverage manifest measures independent-lane coverage against a control lane", () => {
  const manifest = buildAvitoCoverageManifest(
    [
      { key: "kaynly_control", source_ids: ["57875516", "56777033", "57980066"] },
      { key: "sitemap", source_ids: ["57875516", "57980066", "50000000"] },
      { key: "public_index", source_ids: ["57875516"] },
    ],
    "kaynly_control",
    { now: () => "2026-09-04T20:00:00.000Z" },
  );

  assert.equal(manifest.control_unique_ids, 3);
  assert.equal(manifest.union_unique_ids, 4);
  assert.deepEqual(manifest.control_ids_missing_from_other_lanes, ["56777033"]);

  const sitemap = manifest.lanes.find((lane) => lane.key === "sitemap");
  assert.equal(sitemap?.overlap_with_control, 2);
  assert.equal(sitemap?.control_coverage_ratio, 2 / 3);
});

import { readFileSync } from "node:fs";

import {
  certifyHaEvidenceBundle,
  type HaEvidenceBundleForCertification,
} from "./certify-ha-evidence-bundle.js";

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/ha-dr/certify-ha-evidence-file.ts <HA_DR_EVIDENCE.json>",
  );
  process.exit(64);
}

const file = process.argv[2];
if (!file) usage();

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        verdict: "FAIL",
        blockers: [],
        failures: ["evidence_file_unreadable_or_invalid_json"],
        detail: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
  console.error(
    JSON.stringify(
      {
        verdict: "FAIL",
        blockers: [],
        failures: ["evidence_root_must_be_object"],
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

let result;
try {
  result = certifyHaEvidenceBundle(
    parsed as HaEvidenceBundleForCertification,
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        verdict: "FAIL",
        blockers: [],
        failures: ["evidence_shape_invalid_for_certification"],
        detail: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

if (result.verdict === "PASS") process.exit(0);
if (result.verdict === "BLOCKED") process.exit(2);
process.exit(1);

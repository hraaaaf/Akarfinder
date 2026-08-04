import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ODM_PUBLIC_CANARY_MAX_PERCENT,
  readPublicCanaryPercent,
  shouldServeOdmPublicCanary,
} from "../../../lib/odm/odm-public-canary.ts";

const controller = readFileSync("lib/odm/odm-public-canary.ts", "utf8");
const campaign = readFileSync("scripts/certify-odm-full-cutover-100-production-v1.mjs", "utf8");
const workflow = readFileSync(".github/workflows/odm-full-cutover-100-production-certification-v1.yml", "utf8");
const runbook = readFileSync("docs/ODM-FULL-CUTOVER-100-PRODUCTION-RUNBOOK.md", "utf8");

test("controller permits one hundred percent and stays fail closed above it", () => {
  assert.equal(ODM_PUBLIC_CANARY_MAX_PERCENT, 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "50" } as NodeJS.ProcessEnv), 50);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100" } as NodeJS.ProcessEnv), 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100.01" } as NodeJS.ProcessEnv), 0);
  assert.equal(shouldServeOdmPublicCanary("stable", {
    ODM_PUBLIC_CANARY_ENABLED: "true",
    ODM_PUBLIC_CANARY_APPROVED: "true",
    ODM_PUBLIC_CANARY_STOP: "true",
    ODM_PUBLIC_CANARY_PERCENT: "100",
  } as NodeJS.ProcessEnv), false);
});

test("controller retains explicit approval and emergency stop controls", () => {
  assert.match(controller, /ODM_PUBLIC_CANARY_ENABLED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_APPROVED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_STOP/);
  assert.match(controller, /ODM_PUBLIC_CANARY_MAX_PERCENT = 100/);
  assert.match(controller, /bucket\(stableKey\)\s*<\s*Math\.floor\(percent \* 100\)/);
});

test("campaign certifies all 240 requests through ODM across both bucket halves", () => {
  assert.match(campaign, /TARGET_PERCENT = 100/);
  assert.match(campaign, /EXPECTED_REQUESTS = 240/);
  assert.match(campaign, /EXPECTED_ODM = 240/);
  assert.match(campaign, /EXPECTED_LEGACY = 0/);
  assert.match(campaign, /EXPECTED_LOWER_HALF = 120/);
  assert.match(campaign, /EXPECTED_UPPER_HALF = 120/);
  assert.match(campaign, /exact_120_120_bucket_half_plan/);
  assert.match(campaign, /all_routes_odm/);
  assert.match(campaign, /lower_half_all_odm/);
  assert.match(campaign, /upper_half_all_odm/);
  assert.match(campaign, /bucket_rate_full_cutover/);
  assert.match(campaign, /rate === 1/);
});

test("campaign preserves coverage, filters, provenance and publication boundaries", () => {
  assert.match(campaign, /all_ten_cities/);
  assert.match(campaign, /all_four_property_types/);
  assert.match(campaign, /all_three_intents/);
  assert.match(campaign, /search_result_display_mode !== "thin_indexed_seed"/);
  assert.match(campaign, /typeof listing\.result_origin !== "string"/);
  assert.match(campaign, /listing\.source_badge !== "external_indexed"/);
  assert.match(campaign, /can_show_contact === true/);
  assert.match(campaign, /can_show_gallery === true/);
  assert.match(campaign, /can_show_thumbnail === true/);
  assert.match(campaign, /original_source_required !== true/);
  assert.match(campaign, /source_access_level !== "indexed_only"/);
  assert.match(campaign, /commercial_tier_leak/);
  assert.match(campaign, /visible_page_api_lane_parity/);
  assert.match(campaign, /odm_p95_within_5s/);
  assert.match(campaign, /odm_p99_within_10s/);
});

test("campaign uses deterministic structured first-page queries", () => {
  assert.match(campaign, /q: undefined/);
  assert.match(campaign, /offset: 0/);
  assert.match(campaign, /all_offsets_zero/);
  assert.match(campaign, /all_queries_structured_only/);
  assert.match(campaign, /AKARFINDER_CERTIFICATION_DRY_RUN/);
  assert.match(campaign, /bucket_half/);
});

test("workflow is manual, read only for hosting and persists audit evidence", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_activation/);
  assert.match(workflow, /CERTIFY_100_PERCENT/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /AKARFINDER_CERTIFICATION_DRY_RUN: "true"/);
  assert.match(workflow, /certification-results/);
  assert.match(workflow, /reports\/odm-full-cutover-100-production-latest\.json/);
  assert.match(workflow, /! grep -R "ODM_PUBLIC_CANARY_PERCENT=100"/);
  assert.doesNotMatch(workflow, /vercel env/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN/);
});

test("runbook preserves the fifty percent rollback and defers Legacy removal", () => {
  assert.match(runbook, /ODM_PUBLIC_CANARY_PERCENT=50/);
  assert.match(runbook, /ODM_PUBLIC_CANARY_STOP=true/);
  assert.match(runbook, /Legacy reste disponible comme chemin de rollback/);
  assert.match(runbook, /aucune suppression du moteur Legacy dans ce LOT/);
});

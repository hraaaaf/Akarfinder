import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ODM_PUBLIC_CANARY_MAX_PERCENT,
  readPublicCanaryPercent,
  shouldServeOdmPublicCanary,
} from "../../../lib/odm/odm-public-canary.ts";

const controller = readFileSync("lib/odm/odm-public-canary.ts", "utf8");
const campaign = readFileSync("scripts/certify-odm-canary-25-production-v1.mjs", "utf8");
const workflow = readFileSync(".github/workflows/odm-canary-25-production-certification-v1.yml", "utf8");

test("controller permits at most twenty-five percent and stays fail closed", () => {
  assert.equal(ODM_PUBLIC_CANARY_MAX_PERCENT, 25);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "25" } as NodeJS.ProcessEnv), 25);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "25.01" } as NodeJS.ProcessEnv), 0);
  assert.equal(shouldServeOdmPublicCanary("stable", {
    ODM_PUBLIC_CANARY_ENABLED: "true",
    ODM_PUBLIC_CANARY_APPROVED: "true",
    ODM_PUBLIC_CANARY_STOP: "true",
    ODM_PUBLIC_CANARY_PERCENT: "25",
  } as NodeJS.ProcessEnv), false);
});

test("controller still requires explicit enabled and approved flags", () => {
  assert.match(controller, /ODM_PUBLIC_CANARY_ENABLED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_APPROVED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_STOP/);
  assert.match(controller, /ODM_PUBLIC_CANARY_MAX_PERCENT = 25/);
  assert.match(controller, /bucket\(stableKey\)\s*<\s*Math\.floor\(percent \* 100\)/);
});

test("campaign is an exact balanced 240-request twenty-five-percent plan", () => {
  assert.match(campaign, /TARGET_PERCENT = 25/);
  assert.match(campaign, /EXPECTED_REQUESTS = 240/);
  assert.match(campaign, /EXPECTED_CANARY = 120/);
  assert.match(campaign, /EXPECTED_LEGACY = 120/);
  assert.match(campaign, /exact_120_120_lane_plan/);
  assert.match(campaign, /bucket_rate_near_twenty_five_percent/);
  assert.match(campaign, /rate >= 0\.235 && rate <= 0\.265/);
  assert.match(campaign, /all_ten_cities/);
  assert.match(campaign, /all_four_property_types/);
  assert.match(campaign, /all_three_intents/);
});

test("campaign preserves publication boundaries and truthful provenance", () => {
  assert.match(campaign, /search_result_display_mode !== "thin_indexed_seed"/);
  assert.match(campaign, /typeof listing\.result_origin !== "string"/);
  assert.match(campaign, /listing\.source_badge !== "external_indexed"/);
  assert.match(campaign, /can_show_contact === true/);
  assert.match(campaign, /can_show_gallery === true/);
  assert.match(campaign, /can_show_thumbnail === true/);
  assert.match(campaign, /original_source_required !== true/);
  assert.match(campaign, /source_access_level !== "indexed_only"/);
  assert.match(campaign, /commercial_tier_leak/);
});

test("campaign uses meaningful first-page structured queries", () => {
  assert.match(campaign, /q: undefined/);
  assert.match(campaign, /offset: 0/);
  assert.match(campaign, /all_offsets_zero/);
  assert.match(campaign, /all_queries_structured_only/);
  assert.match(campaign, /AKARFINDER_CERTIFICATION_DRY_RUN/);
});

test("workflow cannot activate Production and requires explicit manual certification confirmation", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm_activation/);
  assert.match(workflow, /CERTIFY_25_PERCENT/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /AKARFINDER_CERTIFICATION_DRY_RUN: "true"/);
  assert.match(workflow, /certification-results/);
  assert.match(workflow, /reports\/odm-canary-25-production-latest\.json/);
  assert.match(workflow, /! grep -R "ODM_PUBLIC_CANARY_PERCENT=25"/);
  assert.doesNotMatch(workflow, /vercel env add/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ODM_PUBLIC_CANARY_MAX_PERCENT,
  readPublicCanaryPercent,
} from "../../../lib/odm/odm-public-canary.ts";

const controller = readFileSync("lib/odm/odm-public-canary.ts", "utf8");
const commercialPriority = readFileSync("lib/search/search-commercial-priority.ts", "utf8");
const campaign = readFileSync("scripts/certify-odm-canary-10-production-v1.mjs", "utf8");
const workflow = readFileSync(".github/workflows/odm-canary-10-production-certification-v1.yml", "utf8");

test("public ODM Canary keeps ten percent valid within the full-cutover ceiling", () => {
  assert.equal(ODM_PUBLIC_CANARY_MAX_PERCENT, 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "10" } as NodeJS.ProcessEnv), 10);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "25" } as NodeJS.ProcessEnv), 25);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "50" } as NodeJS.ProcessEnv), 50);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100" } as NodeJS.ProcessEnv), 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100.01" } as NodeJS.ProcessEnv), 0);
});

test("controller remains fail closed behind approval and emergency-stop flags", () => {
  assert.match(controller, /ODM_PUBLIC_CANARY_ENABLED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_APPROVED/);
  assert.match(controller, /ODM_PUBLIC_CANARY_STOP/);
  assert.match(controller, /bucket\(stableKey\)\s*<\s*Math\.floor\(percent \* 100\)/);
});

test("ODM mapping applies commercial priority and indexed results fail closed to category four", () => {
  assert.match(controller, /prioritizeCommercialSearchListings\(listings\)/);
  assert.match(controller, /source_access_level:\s*"indexed_only"/);
  assert.match(controller, /original_source_required:\s*true/);
  assert.match(controller, /can_show_contact:\s*false/);
  assert.match(controller, /can_show_gallery:\s*false/);
  assert.match(commercialPriority, /return\s+"public_indexed"/);
});

test("campaign revision two uses meaningful structured first-page queries", () => {
  assert.match(campaign, /campaign_revision:\s*2/);
  assert.match(campaign, /AKARFINDER_CERTIFICATION_DRY_RUN/);
  assert.match(campaign, /q:\s*undefined/);
  assert.match(campaign, /offset:\s*0/);
  assert.match(campaign, /broad_structured_ranges/);
  assert.match(campaign, /all_offsets_zero/);
  assert.match(campaign, /all_queries_structured_only/);
  assert.doesNotMatch(campaign, /\$\{city\}\s+\$\{c\.property_type\}/);
});

test("campaign preserves real provenance instead of confusing it with the transport lane", () => {
  assert.match(campaign, /typeof listing\.result_origin !== "string"/);
  assert.match(campaign, /listing\.search_result_display_mode !== "thin_indexed_seed"/);
  assert.match(campaign, /listing\.source_badge !== "external_indexed"/);
  assert.doesNotMatch(campaign, /listing\.result_origin !== "search_api"/);
  assert.match(campaign, /result_origin:\s*"preserved_provenance_required"/);
});

test("production campaign remains a stratified 240-request ten-percent certification", () => {
  assert.match(campaign, /EXPECTED_REQUESTS\s*=\s*240/);
  assert.match(campaign, /CANARY_PER_CITY\s*=\s*8/);
  assert.match(campaign, /LEGACY_PER_CITY\s*=\s*16/);
  assert.match(campaign, /target_percent:\s*TARGET_PERCENT/);
  assert.match(campaign, /results\.length\s*===\s*EXPECTED_REQUESTS/);
  assert.match(campaign, /expected_canary:\s*canary\.length/);
  assert.match(campaign, /expected_legacy:\s*legacy\.length/);
  assert.match(campaign, /all_ten_cities/);
  assert.match(campaign, /all_four_property_types/);
  assert.match(campaign, /all_three_intents/);
  assert.match(campaign, /enough_non_empty_canary_evidence/);
  assert.match(campaign, /selectVisibleCandidates\(nonEmptyCanary\)/);
  assert.match(campaign, /visible_page_api_lane_parity/);
  assert.match(campaign, /canary_p99_within_10s/);
  assert.match(campaign, /no_filter_contract_or_policy_leaks/);
});

test("workflow runs contracts on PRs and persists real evidence only after merge or dispatch", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if:\s*github\.event_name\s*!=\s*'pull_request'/);
  assert.match(workflow, /https:\/\/akarfinder\.vercel\.app/);
  assert.match(workflow, /odm-canary-10-production-certification-v1\.json/);
  assert.match(workflow, /certification-results/);
  assert.match(workflow, /reports\/odm-canary-10-production-latest\.json/);
});

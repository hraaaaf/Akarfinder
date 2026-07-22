import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildNeighborhoodIntelligenceV2FromV1 } from "../../../lib/neighborhood-intelligence/build-v2-from-v1.js";
import { canonicalRepositoryReadinessChecks, evaluateFinalProductionGate } from "../../../lib/launch-readiness/final-production-gate-v1.js";

const root = process.cwd();
const exists = (path: string) => existsSync(join(root, path));

describe("#20 Final Production Gate & Launch Readiness V1", () => {
  it("never returns GO when any blocking launch condition remains", () => {
    const result = evaluateFinalProductionGate([
      { id: "ok", area: "technical", status: "pass", summary: "ok", evidence: ["x"] },
      { id: "block", area: "production", status: "block", summary: "blocked", evidence: ["y"] },
    ]);
    assert.equal(result.verdict, "NO_GO");
    assert.deepEqual(result.blockers.map((item) => item.id), ["block"]);
  });

  it("audits the repository against all six canonical launch areas without hiding known gaps", () => {
    const workflow = readFileSync(join(root, ".github/workflows/canonical-baseline-validation.yml"), "utf8");
    const neighborhoodCount = buildNeighborhoodIntelligenceV2FromV1().length;

    const checks = canonicalRepositoryReadinessChecks({
      propertySchemaReady: exists("lib/property-schema/core.ts"),
      publicationEligibilityReady: exists("lib/index-lifecycle/state-machine.ts"),
      neighborhoodReferenceReady: exists("lib/neighborhood-intelligence/schema-v2.ts") && neighborhoodCount > 0,
      neighborhoodNationalEnrichmentComplete: neighborhoodCount >= 200,
      intelligenceChainReady: [
        "lib/intelligence/akar-score-v2.ts",
        "lib/search-profile-v2/profile-engine.ts",
        "lib/property-fit-v1/property-fit-engine.ts",
        "lib/companion-v1/state-machine.ts",
      ].every(exists),
      frenchCoreJourneyReady: ["app/page.tsx","app/search/page.tsx","app/compagnon/page.tsx","app/mon-projet/page.tsx"].every(exists),
      arabicCoreJourneyReady: ["app/ar/page.tsx","app/ar/search/page.tsx","app/ar/compagnon/page.tsx","app/ar/mon-projet/page.tsx"].every(exists),
      responsiveContractReady: false,
      partnerActivationReady: exists("lib/professional/commercial-activation.ts") && exists("lib/professional/partner-property-onboarding.ts"),
      userContinuityReady: exists("lib/user-continuity/service.ts") && exists("supabase/migrations/20260722034000_user_continuity_anon_grant_hardening.sql"),
      canonicalCiReady: workflow.includes("User Continuity V1 suite") && workflow.includes("Compagnon AkarFinder State Machine V1 suite"),
      databaseSecurityReady: exists("supabase/migrations/20260722034000_user_continuity_anon_grant_hardening.sql"),
      productionDeploymentReady: false,
    });

    const result = evaluateFinalProductionGate(checks);
    assert.equal(result.verdict, "NO_GO");
    assert.ok(result.blockers.some((item) => item.id === "ux-arabic-rtl-core"));
    assert.ok(result.blockers.some((item) => item.id === "production-deployment"));
    assert.ok(result.warnings.some((item) => item.id === "national-neighborhood-enrichment"));
    assert.ok(result.warnings.some((item) => item.id === "responsive-contract"));
    assert.ok(result.passes.some((item) => item.id === "intelligence-chain"));
    assert.ok(result.passes.some((item) => item.id === "business-boundaries"));
    assert.equal(neighborhoodCount, 75, "retained V1 coverage must be reported honestly until national enrichment expands it");
  });

  it("keeps commercial tier out of personalized Fit/ranking launch evidence", () => {
    const fit = readFileSync(join(root, "lib/property-fit-v1/property-fit-engine.ts"), "utf8");
    const ranking = readFileSync(join(root, "lib/property-fit-v1/personalized-ranking.ts"), "utf8");
    assert.equal(/commercial_tier|partner_badge/.test(fit), false);
    assert.equal(/commercial_tier|partner_badge/.test(ranking), false);
  });
});

#!/usr/bin/env tsx
// P0.1 — Read-only proof of the exact Common Crawl source/channel policy set.
// No Common Crawl request, no source-site request, no DB mutation.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";
import { selectRegistryMassHarvestDomains } from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import { loadMassIndexSourcePolicies } from "@/lib/acquisition-scale-v1/mass-index-source-policy-db";

const REPORT_PATH = join(process.cwd(), "data/audits/runtime/p0-1-commoncrawl-policy-projection.json");

export async function buildP01CommonCrawlPolicyReport() {
  const structuralDomains = selectRegistryMassHarvestDomains(loadSourceDomainRegistry());
  const policies = await loadMassIndexSourcePolicies(structuralDomains);
  const evaluation = evaluateMassIndexDomains(
    structuralDomains,
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );
  const rejectionBreakdown = evaluation.decisions
    .filter((decision) => !decision.allowed)
    .reduce<Record<string, number>>((acc, decision) => {
      acc[decision.reason] = (acc[decision.reason] ?? 0) + 1;
      return acc;
    }, {});

  return {
    gate_version: "p0_1_mass_index_source_registry_v1",
    discovery_channel: MASS_INDEX_COMMONCRAWL_CHANNEL,
    structural_candidate_domains: structuralDomains.length,
    policy_rows_loaded: policies.length,
    allowed_domains: evaluation.allowedDomains,
    rejected_domains: evaluation.decisions.filter((decision) => !decision.allowed),
    rejection_breakdown: rejectionBreakdown,
    fail_closed: evaluation.decisions.every(
      (decision) => decision.allowed === (decision.reason === "allowed"),
    ),
    authority: "public.source_policy_registry",
    db_mutation: false,
    commoncrawl_request: false,
  };
}

async function main() {
  const report = await buildP01CommonCrawlPolicyReport();
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.fail_closed) throw new Error("P0.1 Source Registry audit integrity failed");
  if (report.structural_candidate_domains > 0 && report.allowed_domains.length === 0) {
    throw new Error("P0.1 audit found zero policy-authorized Common Crawl domains");
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

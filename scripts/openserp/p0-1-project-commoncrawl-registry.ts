#!/usr/bin/env tsx
// P0.1 — Projects the structural OpenSERP registry through the canonical
// production Source Registry before a Common Crawl mass harvest/import.
//
// This mutates only the ephemeral checkout copy of source-domain-registry.json.
// It NEVER changes Source Registry policy and NEVER upgrades a domain. A domain
// rejected by policy becomes unclassified for this job, preserving patterns as
// structure-only evidence while preventing harvest/import admission.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  loadSourceDomainRegistry,
  type SourceDomainRegistry,
} from "@/lib/openserp-ingestion/domain-registry";
import { selectRegistryMassHarvestDomains } from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import { loadMassIndexSourcePolicies } from "@/lib/acquisition-scale-v1/mass-index-source-policy-db";

const REGISTRY_PATH = join(process.cwd(), "data/openserp/source-domain-registry.json");
const REPORT_PATH = join(process.cwd(), "data/audits/runtime/p0-1-commoncrawl-policy-projection.json");

export function projectRegistryForCommonCrawl(
  registry: SourceDomainRegistry,
  allowedDomains: string[],
): SourceDomainRegistry {
  const allowed = new Set(allowedDomains.map((domain) => domain.toLowerCase()));
  return {
    ...registry,
    registry_version: `${registry.registry_version}+p0-1-commoncrawl-policy-projection`,
    generated_at: new Date().toISOString(),
    note: `${registry.note} P0.1 runtime projection: structural approval does not authorize Common Crawl; only domains admitted by source_policy_registry for the exact commoncrawl channel remain approved_discovery in this ephemeral job copy.`,
    domains: registry.domains.map((entry) => {
      if (entry.status !== "approved_discovery" || allowed.has(entry.domain)) return entry;
      return {
        ...entry,
        status: "unclassified" as const,
        compliance_note: `${entry.compliance_note} P0.1 runtime projection: Common Crawl disabled by canonical Source Registry policy.`,
      };
    }),
  };
}

async function main() {
  const originalText = readFileSync(REGISTRY_PATH, "utf8");
  const registry = loadSourceDomainRegistry(REGISTRY_PATH);
  const structuralCandidates = selectRegistryMassHarvestDomains(registry);
  const policies = await loadMassIndexSourcePolicies(structuralCandidates);
  const evaluated = evaluateMassIndexDomains(
    structuralCandidates,
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );

  const projected = projectRegistryForCommonCrawl(registry, evaluated.allowedDomains);
  const projectedText = `${JSON.stringify(projected, null, 2)}\n`;
  writeFileSync(REGISTRY_PATH, projectedText, "utf8");

  const rejectionBreakdown = evaluated.decisions
    .filter((decision) => !decision.allowed)
    .reduce<Record<string, number>>((acc, decision) => {
      acc[decision.reason] = (acc[decision.reason] ?? 0) + 1;
      return acc;
    }, {});

  const report = {
    gate_version: "p0_1_mass_index_source_registry_v1",
    discovery_channel: MASS_INDEX_COMMONCRAWL_CHANNEL,
    structural_candidate_domains: structuralCandidates.length,
    policy_rows_loaded: policies.length,
    allowed_domains: evaluated.allowedDomains,
    rejected_domains: evaluated.decisions.filter((decision) => !decision.allowed),
    rejection_breakdown: rejectionBreakdown,
    original_registry_sha256: createHash("sha256").update(originalText).digest("hex"),
    projected_registry_sha256: createHash("sha256").update(projectedText).digest("hex"),
    fail_closed: evaluated.decisions.every(
      (decision) => decision.allowed === (decision.reason === "allowed"),
    ),
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.fail_closed) {
    throw new Error("P0.1 Source Registry projection integrity failed");
  }
  if (structuralCandidates.length > 0 && evaluated.allowedDomains.length === 0) {
    throw new Error("P0.1 blocked Common Crawl mass harvest: zero policy-authorized domains");
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";

import {
  resolveRegistryPolicy,
  validateAssignmentManifest,
  validateEvidenceAlignment,
  validateMigrationCoverage,
  type SourcePolicyEvidencePayload,
  type SourceRegistryAssignmentManifest,
  type TechnicalCapabilityPayload,
} from "./source-registry-assignment";

const manifestPath = process.env.DATA_1_6B_MANIFEST_PATH ?? "scripts/census/data-1-6b-policy-decisions.json";
const migrationPath = process.env.DATA_1_6B_MIGRATION_PATH ?? "supabase/migrations/20260807140000_data_1_6b_source_registry_assignment.sql";
const policyEvidencePath = process.env.DATA_1_6A_EVIDENCE_JSON ?? ".tmp/data-1-6b/input/policy/source-policy-evidence-review.json";
const technicalEvidencePath = process.env.DATA_1_5_TECH_AUDIT_JSON ?? ".tmp/data-1-6b/input/technical/technical-capability-audit.json";
const outDir = process.env.DATA_1_6B_OUT_DIR ?? ".tmp/data-1-6b/results";
const POLICY_RUN_ID = 31182352538;
const TECHNICAL_RUN_ID = 31178327843;
const REQUEST_TIMEOUT_MS = 8_000;

function countBy<T extends string>(values: T[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

async function fetchExistingRegistryRows(domains: string[]): Promise<Array<{ source_domain: string; policy_version?: string }>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("DATA-1.6B preflight requires Supabase read-only credentials");

  const url = new URL("/rest/v1/source_policy_registry", supabaseUrl);
  url.searchParams.set("select", "source_domain,policy_version");
  url.searchParams.set("source_domain", `in.(${domains.join(",")})`);
  const response = await fetch(url, {
    method: "GET",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DATA-1.6B Registry preflight failed with HTTP ${response.status}`);
  return (await response.json()) as Array<{ source_domain: string; policy_version?: string }>;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const [manifestRaw, policyRaw, technicalRaw, migrationSql] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(policyEvidencePath, "utf8"),
    fs.readFile(technicalEvidencePath, "utf8"),
    fs.readFile(migrationPath, "utf8"),
  ]);

  const manifest = JSON.parse(manifestRaw) as SourceRegistryAssignmentManifest;
  const policyEvidence = JSON.parse(policyRaw) as SourcePolicyEvidencePayload;
  const technicalEvidence = JSON.parse(technicalRaw) as TechnicalCapabilityPayload;

  validateAssignmentManifest(manifest);
  validateEvidenceAlignment(manifest, policyEvidence, technicalEvidence);
  validateMigrationCoverage(migrationSql, manifest);

  const domains = manifest.assignments.map((assignment) => assignment.domain);
  const existingRows = await fetchExistingRegistryRows(domains);
  if (existingRows.length > 0) {
    throw new Error(`DATA-1.6B refuses stale/concurrent assignment; Registry already contains: ${existingRows.map((row) => row.source_domain).sort().join(", ")}`);
  }

  const resolved = manifest.assignments.map((decision) => ({ ...decision, policy: resolveRegistryPolicy(decision) }));
  const activating = resolved.filter(({ policy }) => {
    const authorizationStatus = String(policy.authorizationStatus);
    const acquisitionMode = String(policy.acquisitionMode);
    const displayPolicy = String(policy.displayPolicy);
    const detailFetchPolicy = String(policy.detailFetchPolicy);
    return (
      authorizationStatus === "authorized_partner" ||
      acquisitionMode === "authorized_detail_feed" ||
      acquisitionMode === "partner_feed" ||
      displayPolicy === "partner_content" ||
      detailFetchPolicy === "allowed_bounded"
    );
  });

  const proof = {
    schemaVersion: "data-1-6b-source-registry-assignment-proof-v1",
    generatedAt: new Date().toISOString(),
    sourcePolicyEvidenceRunId: POLICY_RUN_ID,
    sourceTechnicalEvidenceRunId: TECHNICAL_RUN_ID,
    readOnly: true,
    writesPerformed: 0,
    registryReadRequests: 1,
    sourceCount: resolved.length,
    existingRegistryRows: existingRows.length,
    activatingAssignments: activating.length,
    hiddenAssignments: resolved.filter(({ policy }) => policy.displayGate === "hidden").length,
    directFetchEnabled: resolved.filter(({ policy }) => String(policy.detailFetchPolicy) === "allowed_bounded").length,
    partnerAssignments: resolved.filter(({ policy }) => String(policy.authorizationStatus) === "authorized_partner").length,
    evidenceStatusCounts: countBy(resolved.map((row) => row.evidenceStatus)),
    authorizationStatusCounts: countBy(resolved.map((row) => row.policy.authorizationStatus)),
    acquisitionModeCounts: countBy(resolved.map((row) => row.policy.acquisitionMode)),
    detailFetchPolicyCounts: countBy(resolved.map((row) => row.policy.detailFetchPolicy)),
    displayPolicyCounts: countBy(resolved.map((row) => row.policy.displayPolicy)),
    policyVersion: manifest.policyVersion,
    migrationPath,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "assignment-preview.json"), `${JSON.stringify({ sourceEvidenceRunId: manifest.sourceEvidenceRunId, policyVersion: manifest.policyVersion, assignments: resolved }, null, 2)}\n`);

  const rows = [
    ["domain", "evidence_status", "decision_class", "authorization_status", "acquisition_mode", "detail_fetch_policy", "content_reuse_policy", "display_policy", "machine_gate", "display_gate", "policy_hash"],
    ...resolved.map(({ policy, ...decision }) => [
      decision.domain,
      decision.evidenceStatus,
      decision.decisionClass,
      policy.authorizationStatus,
      policy.acquisitionMode,
      policy.detailFetchPolicy,
      policy.contentReusePolicy,
      policy.displayPolicy,
      policy.machineGate,
      policy.displayGate,
      decision.policyHash,
    ]),
  ];
  await fs.writeFile(path.join(outDir, "assignment-preview.csv"), `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`);

  const markdown = [
    "# DATA-1.6B — Source Registry Assignment Preflight",
    "",
    "**Read-only preflight. No Registry write has occurred.**",
    "",
    `- sources: **${proof.sourceCount}**`,
    `- existing target Registry rows: **${proof.existingRegistryRows}**`,
    `- activating assignments: **${proof.activatingAssignments}**`,
    `- hidden assignments: **${proof.hiddenAssignments}**`,
    `- direct fetch enabled: **${proof.directFetchEnabled}**`,
    `- partner assignments: **${proof.partnerAssignments}**`,
    "",
    "## Evidence status",
    "",
    ...Object.entries(proof.evidenceStatusCounts).sort().map(([key, value]) => `- ${key}: **${value}**`),
    "",
    "## Authorization outcome",
    "",
    ...Object.entries(proof.authorizationStatusCounts).sort().map(([key, value]) => `- ${key}: **${value}**`),
    "",
    "The migration may be applied only after this PR is certified and merged. It refuses to overwrite concurrent Registry rows and keeps all 19 sources hidden from public content display.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(outDir, "preflight.md"), `${markdown}\n`);

  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

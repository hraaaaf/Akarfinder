import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildRestrictivePatch,
  evidenceContainsRequiredPhrases,
  isOfficialEvidenceUrl,
  patchIsNonActivating,
  registryRowMatchesAppliedRestrictiveTarget,
  registryRowMatchesSafePrecondition,
  validateDecisionDocument,
  type PolicyDecision,
  type PolicyDecisionDocument,
  type RegistryPolicyRow,
} from "../data4/source-policy-decision";

const OUT_DIR = process.env.DATA_4_9C_OUT_DIR ?? ".tmp/data-4-9c/results";
const DECISION_PATH = "data/source-policy/data-4-9c-decisions.json";
const REST_TIMEOUT_MS = 20_000;
const EVIDENCE_TIMEOUT_MS = 20_000;

type EvidenceObservation = {
  sourceDomain: string;
  url: string;
  kind: string;
  ok: boolean;
  httpStatus: number | null;
  finalUrl: string | null;
  bodySha256: string | null;
  requiredPhraseCount: number;
  requiredPhrasesMatched: boolean;
  blocker: string | null;
};

type MutationPlanEntry = {
  sourceDomain: string;
  decision: "permission_required";
  before: RegistryPolicyRow;
  afterPatch: ReturnType<typeof buildRestrictivePatch>;
  casPreconditions: {
    authorization_status: "unverified";
    terms_status: string;
    content_reuse_policy: string;
    detail_fetch_policy: string;
    machine_gate: "internal_signal_only";
    ingestion_gate: "internal_signal_only";
    display_gate: "hidden";
    display_policy: "internal_signal_only";
    current_representation_count: 0;
    no_bypass_required: true;
    updated_at: string;
  };
  applyAuthorizedByCi: false;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.9C requires ${name}`);
  return value;
}

function authHeaders(): Record<string, string> {
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}` };
}

async function readRegistryRow(sourceDomain: string): Promise<RegistryPolicyRow[]> {
  const url = new URL("/rest/v1/source_policy_registry", requiredEnv("SUPABASE_URL"));
  url.searchParams.set("select", "source_domain,source_name,current_representation_count,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,robots_status,terms_status,partnership_required,legal_review_required,no_bypass_required,evidence_urls,evidence_summary,recommended_action,reviewed_at,next_review_at,updated_at,policy_version,authorization_status,acquisition_mode,allowed_discovery_channels,max_revalidation_interval_days,review_status,policy_effective_at,policy_expires_at,evidence_observed_at,robots_observed_at,terms_observed_at,contact_status,machine_gate,policy_hash,ingestion_gate,display_gate");
  url.searchParams.set("source_domain", `eq.${sourceDomain}`);
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    signal: AbortSignal.timeout(REST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`source_policy_registry read failed ${response.status}: ${await response.text()}`);
  return await response.json() as RegistryPolicyRow[];
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function htmlToSearchText(body: string): string {
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ");
}

async function observeEvidence(sourceDomain: string, spec: PolicyDecision["evidence"][number]): Promise<EvidenceObservation> {
  if (!isOfficialEvidenceUrl(sourceDomain, spec.url)) {
    return {
      sourceDomain,
      url: spec.url,
      kind: spec.kind,
      ok: false,
      httpStatus: null,
      finalUrl: null,
      bodySha256: null,
      requiredPhraseCount: spec.requiredPhrases.length,
      requiredPhrasesMatched: false,
      blocker: "off_origin_evidence_url",
    };
  }
  try {
    const response = await fetch(spec.url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.9C; policy-evidence-only; no-listing-detail-fetch)" },
      signal: AbortSignal.timeout(EVIDENCE_TIMEOUT_MS),
    });
    const finalUrl = response.url || spec.url;
    if (!isOfficialEvidenceUrl(sourceDomain, finalUrl)) throw new Error(`redirect_left_source_origin:${finalUrl}`);
    const body = await response.text();
    const requiredPhrasesMatched = response.ok && evidenceContainsRequiredPhrases(htmlToSearchText(body), spec.requiredPhrases);
    return {
      sourceDomain,
      url: spec.url,
      kind: spec.kind,
      ok: response.ok && requiredPhrasesMatched,
      httpStatus: response.status,
      finalUrl,
      bodySha256: sha256(body),
      requiredPhraseCount: spec.requiredPhrases.length,
      requiredPhrasesMatched,
      blocker: !response.ok ? `http_${response.status}` : requiredPhrasesMatched ? null : "required_phrase_mismatch",
    };
  } catch (error) {
    return {
      sourceDomain,
      url: spec.url,
      kind: spec.kind,
      ok: false,
      httpStatus: null,
      finalUrl: null,
      bodySha256: null,
      requiredPhraseCount: spec.requiredPhrases.length,
      requiredPhrasesMatched: false,
      blocker: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const observedAt = new Date().toISOString();
  const decisionText = await fs.readFile(DECISION_PATH, "utf8");
  const doc = JSON.parse(decisionText) as PolicyDecisionDocument;
  const decisionErrors = validateDecisionDocument(doc);
  if (decisionErrors.length > 0) throw new Error(`invalid_decision_document:${decisionErrors.join(",")}`);

  const evidenceManifest: EvidenceObservation[] = [];
  const registryBefore: RegistryPolicyRow[] = [];
  const mutationPlan: MutationPlanEntry[] = [];
  const postApplyCertification: RegistryPolicyRow[] = [];
  const rollbackPlan: Array<{
    sourceDomain: string;
    restore: RegistryPolicyRow;
    casPolicyHash: string;
    rollbackAuthorizedByCi: false;
  }> = [];
  const sourceDecisions: Array<{
    sourceDomain: string;
    decision: string;
    registryMutationPlanned: boolean;
    registryPreconditionOk: boolean;
    evidenceOk: boolean;
    mutationPlanReady: boolean;
    registryAppliedRestrictive: boolean;
    transitionState: "PLAN_READY" | "ALREADY_APPLIED_RESTRICTIVE" | "NO_MUTATION" | "BLOCKED";
    blocker: string | null;
  }> = [];

  for (const decision of doc.sources) {
    const rows = await readRegistryRow(decision.sourceDomain);
    if (rows.length !== 1) throw new Error(`registry_row_count:${decision.sourceDomain}:${rows.length}`);
    const before = rows[0]!;
    registryBefore.push(before);
    const registryPreconditionOk = registryRowMatchesSafePrecondition(before);
    const registryAppliedRestrictive = decision.registryMutationPlanned
      ? registryRowMatchesAppliedRestrictiveTarget(before, decision)
      : false;

    const observations: EvidenceObservation[] = [];
    for (const spec of decision.evidence) observations.push(await observeEvidence(decision.sourceDomain, spec));
    evidenceManifest.push(...observations);

    const mutationEvidence = decision.registryMutationPlanned
      ? observations.filter((row) => row.kind === "official_terms")
      : observations;
    const evidenceOk = decision.registryMutationPlanned
      ? mutationEvidence.length > 0 && mutationEvidence.every((row) => row.ok)
      : true;

    let mutationPlanReady = false;
    let transitionState: "PLAN_READY" | "ALREADY_APPLIED_RESTRICTIVE" | "NO_MUTATION" | "BLOCKED" = decision.registryMutationPlanned ? "BLOCKED" : "NO_MUTATION";
    let blocker: string | null = null;
    if (decision.registryMutationPlanned) {
      if (!evidenceOk) {
        blocker = "explicit_terms_evidence_failed";
      } else if (registryAppliedRestrictive) {
        postApplyCertification.push(before);
        transitionState = "ALREADY_APPLIED_RESTRICTIVE";
      } else if (!registryPreconditionOk) {
        blocker = "registry_safe_precondition_failed";
      } else {
        const evidenceDigest = sha256(JSON.stringify(
          observations.map((row) => ({ url: row.url, finalUrl: row.finalUrl, bodySha256: row.bodySha256, ok: row.ok })),
        ));
        const policyHash = `sha256:${sha256(`${decisionText}\n${decision.sourceDomain}\n${evidenceDigest}\n${observedAt}`)}`;
        const patch = buildRestrictivePatch(before, decision, observedAt, policyHash);
        if (!patch || !patchIsNonActivating(patch)) throw new Error(`unsafe_patch:${decision.sourceDomain}`);
        mutationPlan.push({
          sourceDomain: decision.sourceDomain,
          decision: "permission_required",
          before,
          afterPatch: patch,
          casPreconditions: {
            authorization_status: "unverified",
            terms_status: before.terms_status,
            content_reuse_policy: before.content_reuse_policy,
            detail_fetch_policy: before.detail_fetch_policy,
            machine_gate: "internal_signal_only",
            ingestion_gate: "internal_signal_only",
            display_gate: "hidden",
            display_policy: "internal_signal_only",
            current_representation_count: 0,
            no_bypass_required: true,
            updated_at: before.updated_at,
          },
          applyAuthorizedByCi: false,
        });
        rollbackPlan.push({
          sourceDomain: decision.sourceDomain,
          restore: before,
          casPolicyHash: policyHash,
          rollbackAuthorizedByCi: false,
        });
        mutationPlanReady = true;
        transitionState = "PLAN_READY";
      }
    }

    sourceDecisions.push({
      sourceDomain: decision.sourceDomain,
      decision: decision.decision,
      registryMutationPlanned: decision.registryMutationPlanned,
      registryPreconditionOk,
      evidenceOk,
      mutationPlanReady,
      registryAppliedRestrictive,
      transitionState,
      blocker,
    });
  }

  const proof = {
    schemaVersion: "data-4-9c-source-policy-decision-v1",
    lot: "DATA-4.9C",
    mode: "READ_ONLY_POLICY_DECISION_AND_CAS_PLAN",
    observedAt,
    decisionDocumentSha256: sha256(decisionText),
    sourceCount: doc.sources.length,
    decisions: {
      permissionRequired: doc.sources.filter((row) => row.decision === "permission_required").length,
      remainUnverified: doc.sources.filter((row) => row.decision === "remain_unverified").length,
      authorized: 0,
      prohibited: 0,
    },
    plannedRegistryMutationCount: mutationPlan.length,
    alreadyAppliedRestrictiveCount: postApplyCertification.length,
    postApplyCertifiedCount: postApplyCertification.length,
    rollbackPlanCount: rollbackPlan.length,
    evidenceObservationCount: evidenceManifest.length,
    evidenceFailures: evidenceManifest.filter((row) => !row.ok).map((row) => ({ sourceDomain: row.sourceDomain, url: row.url, blocker: row.blocker })),
    truthBoundary: {
      robotsOrSitemapIsNotPermission: true,
      absenceOfTermsIsNotPermission: true,
      noImplicitAuthorization: true,
      registryMutationCanOnlyTightenPolicy: true,
      ingestionAuthorizedByThisLot: false,
      publicDisplayAuthorizedByThisLot: false,
      seedWriteAuthorizedByThisLot: false,
      listingDetailFetches: 0,
    },
    databaseWrites: 0,
    registryWrites: 0,
    policyActivations: 0,
    ingestionActivations: 0,
    publicDisplayActivations: 0,
    sourceDecisions,
    nextDecision: mutationPlan.length === 1
      ? "Apply the single CAS-restrictive Agadir policy transition outside CI, then post-certify Registry. No ingestion follows from this lot."
      : postApplyCertification.length === 1
        ? "Restrictive Agadir policy is already applied and post-certified. Close DATA-4.9C; no ingestion follows from this lot."
        : "No Registry transition state is safe on this evidence snapshot; remain fail-closed.",
  };

  if (proof.decisions.authorized !== 0 || proof.truthBoundary.ingestionAuthorizedByThisLot || proof.truthBoundary.publicDisplayAuthorizedByThisLot) {
    throw new Error("DATA-4.9C activation boundary violated");
  }
  if (mutationPlan.length > 1 || mutationPlan.some((row) => row.sourceDomain !== "agadirimmobilier.ma")) {
    throw new Error("DATA-4.9C unexpected mutation cohort");
  }
  if (postApplyCertification.length > 1 || postApplyCertification.some((row) => row.source_domain !== "agadirimmobilier.ma")) {
    throw new Error("DATA-4.9C unexpected post-apply cohort");
  }
  if (mutationPlan.length + postApplyCertification.length !== 1) {
    throw new Error("DATA-4.9C expected exactly one safe Agadir transition state");
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), JSON.stringify(proof, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "evidence-manifest.json"), JSON.stringify(evidenceManifest, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "registry-before.json"), JSON.stringify(registryBefore, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "mutation-plan.json"), JSON.stringify(mutationPlan, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "rollback-plan.json"), JSON.stringify(rollbackPlan, null, 2) + "\n"),
    fs.writeFile(path.join(OUT_DIR, "post-apply-certification.json"), JSON.stringify(postApplyCertification, null, 2) + "\n"),
  ]);

  console.log(JSON.stringify({
    observedAt,
    sourceCount: proof.sourceCount,
    decisions: proof.decisions,
    plannedRegistryMutationCount: proof.plannedRegistryMutationCount,
    alreadyAppliedRestrictiveCount: proof.alreadyAppliedRestrictiveCount,
    evidenceFailures: proof.evidenceFailures,
    sourceDecisions,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

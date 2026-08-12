import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSourceFactoryDecision, type SourceFactoryEvidenceRecord } from "../source-factory-decision";
import { buildSourceFactoryDossiers } from "../source-factory";
import type { DomainReservoirSummary } from "../reservoir-qualification";

function row(): DomainReservoirSummary {
  return {
    sourceDomain: "example.ma",
    domainRole: "DIRECT_PORTAL",
    urlRepresentations: 1_000,
    likelyRealEstateUrls: 900,
    likelyListingDetailUrls: 600,
    likelyCategoryOrSearchUrls: 100,
    ambiguousUrls: 200,
    nonRealEstateUrls: 100,
    realEstateShare: 0.9,
    likelyDetailShare: 0.67,
    likelyMoroccoUrls: 850,
    foreignLikelyUrls: 20,
    geographyUnknownUrls: 130,
    likelyMoroccoRealEstateUrls: 800,
    likelyMoroccoListingDetailUrls: 550,
    moroccoShare: 0.85,
    moroccoShareOfRealEstate: 0.89,
    likelyMoroccoDetailShare: 0.69,
    saleLikelyMoroccoUrls: 400,
    rentLikelyMoroccoUrls: 300,
    bothTransactionLikelyMoroccoUrls: 50,
    unknownTransactionLikelyMoroccoUrls: 50,
    detectedCities: [{ city: "Rabat", urlRepresentations: 300 }],
    duplicateSignalRows: 10,
    duplicateSignalRatio: 0.01,
    registryStatus: "UNREGISTERED",
    authorizationStatus: null,
    displayPolicy: null,
    displayGate: null,
    acquisitionMode: null,
    ingestionGate: null,
    massQueue: "SOURCE_FACTORY",
    massPotentialScore: 98,
    publicActivableNow: false,
    recommendedNextAction: "Review in MASS-2 Source Factory",
  };
}

function dossier() {
  const value = buildSourceFactoryDossiers([row()]).dossiers[0];
  if (!value) throw new Error("missing fixture dossier");
  return value;
}

function baseEvidence(decision: "POLICY_COMPATIBLE" | "CANONICAL_LINK_ONLY", channel: "PUBLIC_SITEMAP" | "CANONICAL_LINK"): SourceFactoryEvidenceRecord[] {
  return [
    {
      kind: "SOURCE_IDENTITY",
      reference: "https://example.ma/",
      observedAt: "2026-08-12T10:00:00Z",
      assertion: "OBSERVATION_ONLY",
    },
    {
      kind: "MOROCCO_MARKET_RELEVANCE",
      reference: "https://example.ma/maroc",
      observedAt: "2026-08-12T10:01:00Z",
      assertion: "OBSERVATION_ONLY",
    },
    {
      kind: "TERMS",
      reference: "https://example.ma/terms",
      observedAt: "2026-08-12T10:02:00Z",
      expiresAt: "2026-09-12T00:00:00Z",
      assertion: "SUPPORTS",
      decision,
      channels: [channel],
    },
  ];
}

test("accepts a fully evidenced canonical-link-only review but never activates or writes Registry", () => {
  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "CANONICAL_LINK_ONLY",
    allowedChannels: ["CANONICAL_LINK"],
    rationale: "Current terms support canonical linking only.",
    evidence: baseEvidence("CANONICAL_LINK_ONLY", "CANONICAL_LINK"),
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "CANONICAL_LINK_ONLY");
  assert.equal(result.decisionAccepted, true);
  assert.deepEqual(result.allowedChannels, ["CANONICAL_LINK"]);
  assert.equal(result.registryPreviewEligible, true);
  assert.equal(result.permissionInferred, false);
  assert.equal(result.publicActivableNow, false);
  assert.equal(result.registryWriteAllowed, false);
  assert.equal(result.potentialVolume.likelyMoroccoRealEstateUrls, 800);
});

test("robots and sitemap structure alone can never establish policy compatibility", () => {
  const evidence = baseEvidence("POLICY_COMPATIBLE", "PUBLIC_SITEMAP")
    .filter((item) => item.kind !== "TERMS")
    .concat([
      {
        kind: "ROBOTS" as const,
        reference: "https://example.ma/robots.txt",
        observedAt: "2026-08-12T10:03:00Z",
        assertion: "OBSERVATION_ONLY" as const,
      },
      {
        kind: "SITEMAP_OR_STRUCTURE" as const,
        reference: "https://example.ma/sitemap.xml",
        observedAt: "2026-08-12T10:04:00Z",
        assertion: "OBSERVATION_ONLY" as const,
      },
    ]);

  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "POLICY_COMPATIBLE",
    allowedChannels: ["PUBLIC_SITEMAP"],
    rationale: "Technical surface observed.",
    evidence,
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "HOLD");
  assert.equal(result.decisionAccepted, false);
  assert.ok(result.gateReasons.includes("MISSING_POLICY_OR_RIGHTS_EVIDENCE"));
});

test("accepts policy-compatible public sitemap only when policy proof, robots and structure are all current", () => {
  const evidence = baseEvidence("POLICY_COMPATIBLE", "PUBLIC_SITEMAP").concat([
    {
      kind: "ROBOTS",
      reference: "https://example.ma/robots.txt",
      observedAt: "2026-08-12T10:03:00Z",
      assertion: "OBSERVATION_ONLY",
    },
    {
      kind: "SITEMAP_OR_STRUCTURE",
      reference: "https://example.ma/sitemap.xml",
      observedAt: "2026-08-12T10:04:00Z",
      assertion: "OBSERVATION_ONLY",
    },
  ]);

  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "POLICY_COMPATIBLE",
    allowedChannels: ["PUBLIC_SITEMAP"],
    rationale: "Dated policy evidence backs the sitemap channel.",
    evidence,
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "POLICY_COMPATIBLE");
  assert.equal(result.decisionAccepted, true);
  assert.equal(result.publicActivableNow, false);
  assert.equal(result.registryWriteAllowed, false);
});

test("expired policy evidence fails closed to HOLD", () => {
  const evidence = baseEvidence("CANONICAL_LINK_ONLY", "CANONICAL_LINK").map((item) =>
    item.kind === "TERMS" ? { ...item, expiresAt: "2026-08-12T11:00:00Z" } : item,
  );
  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "CANONICAL_LINK_ONLY",
    allowedChannels: ["CANONICAL_LINK"],
    rationale: "Expired policy snapshot must not pass.",
    evidence,
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "HOLD");
  assert.ok(result.gateReasons.includes("EXPIRED_EVIDENCE:TERMS"));
});

test("any contradictory current evidence fails closed to HOLD", () => {
  const evidence = baseEvidence("CANONICAL_LINK_ONLY", "CANONICAL_LINK").concat({
    kind: "RIGHTS_OR_PERMISSION",
    reference: "https://example.ma/reuse-policy",
    observedAt: "2026-08-12T10:05:00Z",
    assertion: "CONTRADICTS",
    decision: "CANONICAL_LINK_ONLY",
    channels: ["CANONICAL_LINK"],
  });
  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "CANONICAL_LINK_ONLY",
    allowedChannels: ["CANONICAL_LINK"],
    rationale: "Conflicting proof requires review.",
    evidence,
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "HOLD");
  assert.ok(result.gateReasons.includes("CONTRADICTORY_EVIDENCE"));
});

test("channel mismatch fails closed even when a policy decision is otherwise supported", () => {
  const result = evaluateSourceFactoryDecision(dossier(), {
    sourceDomain: "example.ma",
    decision: "CANONICAL_LINK_ONLY",
    allowedChannels: ["INTERNAL_SIGNAL"],
    rationale: "Wrong channel should be rejected.",
    evidence: baseEvidence("CANONICAL_LINK_ONLY", "CANONICAL_LINK"),
  }, "2026-08-12T12:00:00Z");

  assert.equal(result.decision, "HOLD");
  assert.ok(result.gateReasons.includes("INVALID_CHANNELS_FOR_CANONICAL_LINK_ONLY"));
});

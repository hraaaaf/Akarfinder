import type { TechnicalCapabilityAudit } from "./technical-capability-audit";

export type PolicyEvidenceStatus =
  | "RESTRICTIVE_TERMS_FOUND"
  | "TERMS_FOUND_NO_EXPLICIT_PERMISSION"
  | "PUBLIC_CHANNEL_SIGNAL_FOUND"
  | "INSUFFICIENT_LEGAL_EVIDENCE"
  | "ROBOTS_BLOCK_ALL"
  | "NOINDEX_OBSERVED"
  | "ACCESS_OR_FETCH_LIMITED";

export type PolicyReviewTrack =
  | "PARTNERSHIP_REQUIRED_REVIEW"
  | "PARTNER_OR_INDEX_ONLY_REVIEW"
  | "PUBLIC_CHANNEL_REVIEW"
  | "MANUAL_LEGAL_REVIEW"
  | "BLOCKED_OR_INDEX_ONLY_REVIEW"
  | "BLOCKED_REVIEW";

export type LegalEvidenceSource = "HOMEPAGE_LINK" | "STANDARD_PUBLIC_PATH";
export type LegalEvidenceKind = "TERMS_OR_LEGAL" | "PRIVACY" | "OTHER";

export type LegalEvidencePage = {
  requestedUrl: string;
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  bytesRead: number;
  bodySha256: string | null;
  source: LegalEvidenceSource;
  signalIds: string[];
  error: string | null;
};

export type PolicySignalResult = {
  restrictive: string[];
  publicChannel: string[];
  protectedContent: string[];
};

export type SourcePolicyEvidenceReview = {
  schemaVersion: "data-1-6a-source-policy-evidence-review-v1";
  domain: string;
  seedRank: number;
  generatedAt: string;
  technicalCapability: {
    score: number;
    connectorFamilyCandidate: TechnicalCapabilityAudit["connectorFamilyCandidate"];
    technicalGate: TechnicalCapabilityAudit["technicalGate"];
  };
  requestCount: number;
  robots: {
    status: "PRESENT" | "MISSING" | "BLOCKED" | "UNAVAILABLE";
    disallowAll: boolean;
    evidenceUrl: string;
  };
  homepage: {
    status: number | null;
    noindex: boolean;
    accessControlSignal: boolean;
    evidenceUrl: string | null;
    error: string | null;
  };
  legalPages: LegalEvidencePage[];
  evidenceStatus: PolicyEvidenceStatus;
  evidenceConfidenceScore: number;
  restrictiveSignalIds: string[];
  publicChannelSignalIds: string[];
  protectedContentSignalIds: string[];
  evidenceUrls: string[];
  contactRequired: boolean;
  reviewTrack: PolicyReviewTrack;
  nextAction: string;
  registryDraft: {
    robotsStatusCandidate: null;
    termsStatusCandidate: null;
    authorizationStatusCandidate: null;
    acquisitionModeCandidate: null;
    discoveryPolicyCandidate: null;
    detailFetchPolicyCandidate: null;
    contentReusePolicyCandidate: null;
    displayPolicyCandidate: null;
    machineGateCandidate: null;
    ingestionGateCandidate: null;
    displayGateCandidate: null;
  };
  policyAssignment: null;
};

const LEGAL_LINK_RE = /(?:terms(?:-of-use|-and-conditions)?|conditions?(?:-generales?)?|cgu|mentions?(?:-|_)?legales?|legal(?:-|_)?notice|privacy(?:-|_)?policy|politique(?:-|_)?de(?:-|_)?confidentialite|confidentialite|charte(?:-|_)?de(?:-|_)?confidentialite)/i;
const TERMS_OR_LEGAL_PATH_RE = /(?:terms(?:-of-use|-and-conditions)?|conditions?(?:-generales?)?|cgu|mentions?(?:-|_)?legales?|legal(?:-|_)?notice)/i;
const PRIVACY_PATH_RE = /(?:privacy(?:-|_)?policy|politique(?:-|_)?de(?:-|_)?confidentialite|confidentialite|charte(?:-|_)?de(?:-|_)?confidentialite)/i;

const RESTRICTIVE_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: "explicit_reproduction_restriction",
    regex: /(?:reproduction|reproduire|copie|copier|extraction|extraire|aspiration|scrap(?:ing|er)?|collecte\s+automatisee?).{0,140}(?:interdit|interdite|prohibit(?:ed|ion)?|forbidden|sans\s+(?:autorisation|accord)|without\s+(?:prior\s+)?(?:written\s+)?(?:consent|permission)|not\s+permitted|may\s+not)/is,
  },
  {
    id: "explicit_reproduction_restriction_reverse",
    regex: /(?:interdit|interdite|prohibit(?:ed|ion)?|forbidden|sans\s+(?:autorisation|accord)|without\s+(?:prior\s+)?(?:written\s+)?(?:consent|permission)|not\s+permitted|may\s+not).{0,140}(?:reproduction|reproduire|copie|copier|extraction|extraire|aspiration|scrap(?:ing|er)?|collecte\s+automatisee?)/is,
  },
  {
    id: "prior_authorization_required",
    regex: /(?:autorisation\s+prealable|accord\s+prealable|prior\s+written\s+(?:consent|permission)|written\s+permission|express\s+permission)/i,
  },
  {
    id: "automated_access_restriction",
    regex: /(?:robot|crawler|spider|scrap(?:e|er|ing)|automated\s+(?:tool|access|collection|means)).{0,120}(?:interdit|prohibit(?:ed|ion)?|forbidden|not\s+permitted|may\s+not|sans\s+autorisation)/is,
  },
  {
    id: "commercial_reuse_restriction",
    regex: /(?:usage|utilisation|reuse|reutilisation|exploitation).{0,100}(?:commerciale?|commercial).{0,100}(?:interdit|prohibit(?:ed|ion)?|sans\s+autorisation|without\s+(?:prior\s+)?permission)/is,
  },
];

const SUBSTANTIVE_RESTRICTIVE_SIGNAL_IDS = new Set([
  "explicit_reproduction_restriction",
  "explicit_reproduction_restriction_reverse",
  "automated_access_restriction",
  "commercial_reuse_restriction",
]);

const PROTECTED_CONTENT_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: "copyright_claim", regex: /(?:copyright|droit(?:s)?\s+d['’]auteur|tous\s+droits\s+reserves?|all\s+rights\s+reserved)/i },
  { id: "database_rights_claim", regex: /(?:base\s+de\s+donnees|database).{0,100}(?:protegee?|protected|droit(?:s)?|rights?|propriete|property)/is },
];

const PUBLIC_CHANNEL_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: "public_feed_signal", regex: /(?:rss|atom|xml).{0,80}(?:feed|flux|export|syndication)|(?:feed|flux|syndication).{0,80}(?:rss|atom|xml)/is },
  { id: "public_api_signal", regex: /(?:public\s+api|api\s+(?:publique|public)|developer\s+api|api\s+documentation)/i },
  { id: "explicit_hyperlink_permission_signal", regex: /(?:lien(?:s)?\s+hypertexte|hyperlink(?:s)?).{0,140}(?:autorise|autorisee|permis|permise|allowed|permitted)/is },
  { id: "explicit_open_license_signal", regex: /(?:creative\s+commons|cc\s+by(?:-|\s)|open\s+data\s+license|licence\s+ouverte)/i },
];

const STANDARD_LEGAL_PATHS = [
  "/mentions-legales/",
  "/cgu/",
  "/conditions-generales/",
  "/terms-and-conditions/",
  "/terms-of-use/",
  "/privacy-policy/",
  "/politique-de-confidentialite/",
];

export function normalizePolicyAuditDomain(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!normalized || !normalized.includes(".") || normalized.includes("/") || normalized.includes(" ")) {
    throw new Error(`Invalid DATA-1.6A domain: ${value}`);
  }
  return normalized;
}

function sameSite(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const normalizedDomain = normalizePolicyAuditDomain(domain);
  return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
}

export function classifyLegalEvidenceUrl(value: string | null): LegalEvidenceKind {
  if (!value) return "OTHER";
  try {
    const url = new URL(value);
    const searchable = `${url.pathname}${url.search}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (TERMS_OR_LEGAL_PATH_RE.test(searchable)) return "TERMS_OR_LEGAL";
    if (PRIVACY_PATH_RE.test(searchable)) return "PRIVACY";
    return "OTHER";
  } catch {
    return "OTHER";
  }
}

export function extractSameSiteLegalLinks(html: string, baseUrl: string, domain: string): string[] {
  const links = new Set<string>();
  const hrefRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(hrefRe)) {
    const raw = (match[1] ?? "").trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(raw)) continue;
    try {
      const url = new URL(raw, baseUrl);
      if (!/^https?:$/.test(url.protocol) || !sameSite(url.hostname, domain)) continue;
      const searchable = `${url.pathname}${url.search}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!LEGAL_LINK_RE.test(searchable)) continue;
      url.hash = "";
      links.add(url.toString());
    } catch {
      // Ignore malformed public links.
    }
  }
  return [...links].sort((a, b) => {
    const priority = (value: string) => (classifyLegalEvidenceUrl(value) === "TERMS_OR_LEGAL" ? 0 : 1);
    return priority(a) - priority(b) || a.localeCompare(b);
  });
}

export function standardLegalUrls(domain: string): string[] {
  const normalized = normalizePolicyAuditDomain(domain);
  return STANDARD_LEGAL_PATHS.map((pathname) => `https://${normalized}${pathname}`);
}

function normalizedText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500_000);
}

export function detectPolicySignals(body: string): PolicySignalResult {
  const text = normalizedText(body);
  const restrictive = RESTRICTIVE_PATTERNS.filter((item) => item.regex.test(text)).map((item) => item.id);
  const publicChannel = PUBLIC_CHANNEL_PATTERNS.filter((item) => item.regex.test(text)).map((item) => item.id);
  const protectedContent = PROTECTED_CONTENT_PATTERNS.filter((item) => item.regex.test(text)).map((item) => item.id);
  return {
    restrictive: [...new Set(restrictive)].sort(),
    publicChannel: [...new Set(publicChannel)].sort(),
    protectedContent: [...new Set(protectedContent)].sort(),
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isSuccessfulEvidencePage(page: LegalEvidencePage): boolean {
  return page.status != null && page.status >= 200 && page.status < 300 && Boolean(page.bodySha256);
}

export function buildSourcePolicyEvidenceReview(input: {
  technicalAudit: TechnicalCapabilityAudit;
  generatedAt: string;
  requestCount: number;
  robots: SourcePolicyEvidenceReview["robots"];
  homepage: SourcePolicyEvidenceReview["homepage"];
  legalPages: LegalEvidencePage[];
}): SourcePolicyEvidenceReview {
  const generatedAtMs = Date.parse(input.generatedAt);
  if (!Number.isFinite(generatedAtMs)) throw new Error("DATA-1.6A generatedAt must be a valid timestamp");
  if (!Number.isInteger(input.requestCount) || input.requestCount < 0) throw new Error("DATA-1.6A requestCount must be non-negative");

  const domain = normalizePolicyAuditDomain(input.technicalAudit.seed.domain);
  const successfulRelevantPages = input.legalPages.filter(
    (page) => isSuccessfulEvidencePage(page) && classifyLegalEvidenceUrl(page.finalUrl) !== "OTHER",
  );
  const successfulTermsPages = successfulRelevantPages.filter((page) => classifyLegalEvidenceUrl(page.finalUrl) === "TERMS_OR_LEGAL");
  const successfulPrivacyPages = successfulRelevantPages.filter((page) => classifyLegalEvidenceUrl(page.finalUrl) === "PRIVACY");
  const restrictiveSignalIds = [...new Set(successfulRelevantPages.flatMap((page) => page.signalIds.filter((id) => id.startsWith("restrictive:"))))]
    .map((id) => id.replace(/^restrictive:/, ""))
    .sort();
  const substantiveRestrictiveSignalIds = restrictiveSignalIds.filter((id) => SUBSTANTIVE_RESTRICTIVE_SIGNAL_IDS.has(id));
  const publicChannelSignalIds = [...new Set(successfulRelevantPages.flatMap((page) => page.signalIds.filter((id) => id.startsWith("public_channel:"))))]
    .map((id) => id.replace(/^public_channel:/, ""))
    .sort();
  const protectedContentSignalIds = [...new Set(successfulRelevantPages.flatMap((page) => page.signalIds.filter((id) => id.startsWith("protected_content:"))))]
    .map((id) => id.replace(/^protected_content:/, ""))
    .sort();

  const robotsBlockedLegalPaths = input.legalPages.filter((page) => page.error === "robots_disallow_path").length;
  const homepageFetchFailed = input.homepage.status == null && Boolean(input.homepage.error);
  const accessLimited =
    input.robots.status === "BLOCKED" ||
    input.robots.status === "UNAVAILABLE" ||
    input.homepage.accessControlSignal ||
    homepageFetchFailed ||
    (successfulRelevantPages.length === 0 && robotsBlockedLegalPaths > 0);

  let evidenceStatus: PolicyEvidenceStatus;
  let reviewTrack: PolicyReviewTrack;
  let nextAction: string;

  if (input.robots.disallowAll) {
    evidenceStatus = "ROBOTS_BLOCK_ALL";
    reviewTrack = "BLOCKED_REVIEW";
    nextAction = "Do not fetch candidate content. Review source policy manually or seek written permission/partnership.";
  } else if (input.homepage.noindex) {
    evidenceStatus = "NOINDEX_OBSERVED";
    reviewTrack = "BLOCKED_OR_INDEX_ONLY_REVIEW";
    nextAction = "Treat noindex as a blocking governance signal and require explicit manual policy review before any source activation.";
  } else if (substantiveRestrictiveSignalIds.length > 0) {
    evidenceStatus = "RESTRICTIVE_TERMS_FOUND";
    reviewTrack = "PARTNERSHIP_REQUIRED_REVIEW";
    nextAction = "Escalate for human/legal review and obtain written permission or partnership terms before any ingestion or reuse.";
  } else if (successfulRelevantPages.length > 0 && publicChannelSignalIds.length > 0) {
    evidenceStatus = "PUBLIC_CHANNEL_SIGNAL_FOUND";
    reviewTrack = "PUBLIC_CHANNEL_REVIEW";
    nextAction = "Review the published channel/license terms manually. A public API/feed/link signal is not itself permission to ingest or reuse content.";
  } else if (successfulTermsPages.length > 0) {
    evidenceStatus = "TERMS_FOUND_NO_EXPLICIT_PERMISSION";
    reviewTrack = "PARTNER_OR_INDEX_ONLY_REVIEW";
    nextAction = "No explicit reuse authorization was established in the observed terms/legal page. Review for link-only/index-only treatment or request written permission.";
  } else if (accessLimited) {
    evidenceStatus = "ACCESS_OR_FETCH_LIMITED";
    reviewTrack = "MANUAL_LEGAL_REVIEW";
    nextAction = "Automated evidence collection is insufficient. Do not bypass access controls; perform manual review or contact the source.";
  } else {
    evidenceStatus = "INSUFFICIENT_LEGAL_EVIDENCE";
    reviewTrack = "MANUAL_LEGAL_REVIEW";
    nextAction = successfulPrivacyPages.length > 0
      ? "Only privacy/data-protection evidence was observed; this does not establish reuse terms. Obtain terms/legal evidence or written permission."
      : "No sufficiently explicit legal/reuse evidence was observed within the bounded public audit. Obtain manual evidence or written permission.";
  }

  const evidenceUrls = [...new Set([
    input.robots.evidenceUrl,
    input.homepage.evidenceUrl,
    ...input.legalPages.flatMap((page) => [page.requestedUrl, page.finalUrl]),
  ].filter((value): value is string => Boolean(value)))].sort();

  const evidenceConfidenceScore = clampScore(
    (input.robots.status === "PRESENT" ? 15 : input.robots.status === "MISSING" ? 5 : 0) +
      (input.homepage.status != null && input.homepage.status >= 200 && input.homepage.status < 300 ? 15 : 0) +
      Math.min(40, successfulTermsPages.length * 20) +
      Math.min(10, successfulPrivacyPages.length * 5) +
      (substantiveRestrictiveSignalIds.length > 0 ? 20 : 0) +
      (publicChannelSignalIds.length > 0 ? 10 : 0) +
      (protectedContentSignalIds.length > 0 ? 5 : 0),
  );

  return {
    schemaVersion: "data-1-6a-source-policy-evidence-review-v1",
    domain,
    seedRank: input.technicalAudit.seed.rank,
    generatedAt: new Date(generatedAtMs).toISOString(),
    technicalCapability: {
      score: input.technicalAudit.capabilityScore,
      connectorFamilyCandidate: input.technicalAudit.connectorFamilyCandidate,
      technicalGate: input.technicalAudit.technicalGate,
    },
    requestCount: input.requestCount,
    robots: input.robots,
    homepage: input.homepage,
    legalPages: [...input.legalPages].sort((a, b) => a.requestedUrl.localeCompare(b.requestedUrl)),
    evidenceStatus,
    evidenceConfidenceScore,
    restrictiveSignalIds,
    publicChannelSignalIds,
    protectedContentSignalIds,
    evidenceUrls,
    contactRequired: true,
    reviewTrack,
    nextAction,
    registryDraft: {
      robotsStatusCandidate: null,
      termsStatusCandidate: null,
      authorizationStatusCandidate: null,
      acquisitionModeCandidate: null,
      discoveryPolicyCandidate: null,
      detailFetchPolicyCandidate: null,
      contentReusePolicyCandidate: null,
      displayPolicyCandidate: null,
      machineGateCandidate: null,
      ingestionGateCandidate: null,
      displayGateCandidate: null,
    },
    policyAssignment: null,
  };
}

export function validateTechnicalAuditsForPolicyReview(audits: TechnicalCapabilityAudit[]): TechnicalCapabilityAudit[] {
  const ready = audits.filter((audit) => audit.technicalGate === "CAPABILITY_REVIEW_READY");
  if (ready.length < 1) throw new Error("DATA-1.6A requires at least one CAPABILITY_REVIEW_READY source from DATA-1.5");
  const seen = new Set<string>();
  for (const audit of ready) {
    const domain = normalizePolicyAuditDomain(audit.seed.domain);
    if (seen.has(domain)) throw new Error(`Duplicate DATA-1.6A domain: ${domain}`);
    if (audit.effectivePolicyCandidate !== null) throw new Error(`${domain}: DATA-1.5 must not carry an effective policy candidate`);
    seen.add(domain);
  }
  return [...ready].sort((a, b) => a.seed.rank - b.seed.rank);
}

export function renderSourcePolicyEvidenceMarkdown(reviews: SourcePolicyEvidenceReview[]): string {
  const statusCounts = new Map<PolicyEvidenceStatus, number>();
  for (const review of reviews) statusCounts.set(review.evidenceStatus, (statusCounts.get(review.evidenceStatus) ?? 0) + 1);
  const lines = [
    "# DATA-1.6A — Source Policy Evidence Review",
    "",
    "This is a read-only evidence report. **No Source Registry policy is assigned by this lot.**",
    "",
    "## Summary",
    "",
    `- sources reviewed: **${reviews.length}**`,
    ...[...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([status, count]) => `- ${status}: **${count}**`),
    "",
    "## Review queue",
    "",
    "| # | Domain | Evidence status | Confidence | Review track | Terms/legal 2xx | Privacy 2xx | Technical family |",
    "|---:|---|---|---:|---|---:|---:|---|",
    ...reviews.map((review, index) => {
      const termsCount = review.legalPages.filter((page) => isSuccessfulEvidencePage(page) && classifyLegalEvidenceUrl(page.finalUrl) === "TERMS_OR_LEGAL").length;
      const privacyCount = review.legalPages.filter((page) => isSuccessfulEvidencePage(page) && classifyLegalEvidenceUrl(page.finalUrl) === "PRIVACY").length;
      return `| ${index + 1} | ${review.domain} | ${review.evidenceStatus} | ${review.evidenceConfidenceScore} | ${review.reviewTrack} | ${termsCount} | ${privacyCount} | ${review.technicalCapability.connectorFamilyCandidate} |`;
    }),
    "",
    "## Governance gate",
    "",
    "`DISCOVERED → AUDITED → POLICY_ASSIGNED → ELIGIBLE → CONNECTOR_SELECTED`",
    "",
    "DATA-1.6A stops at `AUDITED`. Privacy-only pages and redirects back to non-legal pages are not counted as terms. Every Registry candidate field and `policyAssignment` remains `null`. Public technical accessibility, robots allowance, feeds, APIs, sitemaps or CMS fingerprints are never treated as reuse authorization.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  detectAccessControl,
  detectNoindex,
  isRobotsPathAllowed,
  parseRobots,
  type HttpEvidence,
  type ParsedRobots,
  type TechnicalCapabilityAudit,
} from "./technical-capability-audit";
import {
  buildSourcePolicyEvidenceReview,
  detectPolicySignals,
  extractSameSiteLegalLinks,
  normalizePolicyAuditDomain,
  renderSourcePolicyEvidenceMarkdown,
  standardLegalUrls,
  validateTechnicalAuditsForPolicyReview,
  type LegalEvidencePage,
  type LegalEvidenceSource,
  type SourcePolicyEvidenceReview,
} from "./source-policy-evidence-review";

const inputPath = process.env.DATA_1_6A_TECH_AUDIT_JSON ?? ".tmp/data-1-6a/input/technical-capability-audit.json";
const outDir = process.env.DATA_1_6A_OUT_DIR ?? ".tmp/data-1-6a/results";
const sourceRunId = Number(process.env.DATA_1_5_EVIDENCE_RUN_ID ?? "31178327843");
const MAX_REQUESTS_PER_DOMAIN = 5;
const MAX_RESPONSE_BYTES = 750_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const DOMAIN_PAUSE_MS = 150;
const USER_AGENT = "AkarFinder-Policy-Evidence-Audit/1.0";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sameSite(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const normalized = normalizePolicyAuditDomain(domain);
  return host === normalized || host.endsWith(`.${normalized}`);
}

async function readLimited(response: Response): Promise<{ text: string; bytesRead: number; truncated: boolean }> {
  if (!response.body) return { text: "", bytesRead: 0, truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = MAX_RESPONSE_BYTES - bytesRead;
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      if (value.byteLength > remaining) {
        chunks.push(value.slice(0, remaining));
        bytesRead += remaining;
        truncated = true;
        break;
      }
      chunks.push(value);
      bytesRead += value.byteLength;
    }
  } finally {
    if (truncated) await reader.cancel().catch(() => undefined);
  }
  const combined = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(combined), bytesRead, truncated };
}

type FetchResult = {
  evidence: HttpEvidence;
  body: string;
  headers: Record<string, string>;
};

async function fetchBounded(url: string, domain: string, budget: { count: number }): Promise<FetchResult> {
  if (budget.count >= MAX_REQUESTS_PER_DOMAIN) {
    return {
      evidence: { requestedUrl: url, finalUrl: null, status: null, contentType: null, bytesRead: 0, truncated: false, error: "request_budget_exhausted" },
      body: "",
      headers: {},
    };
  }
  const requestedUrl = url;
  let current = new URL(url);
  if (current.protocol !== "https:" || !sameSite(current.hostname, domain)) {
    return {
      evidence: { requestedUrl, finalUrl: null, status: null, contentType: null, bytesRead: 0, truncated: false, error: "non_https_or_external_url_blocked" },
      body: "",
      headers: {},
    };
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (budget.count >= MAX_REQUESTS_PER_DOMAIN) {
      return {
        evidence: { requestedUrl, finalUrl: current.toString(), status: null, contentType: null, bytesRead: 0, truncated: false, error: "request_budget_exhausted" },
        body: "",
        headers: {},
      };
    }
    budget.count += 1;
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,text/plain,application/xml,text/xml;q=0.9,*/*;q=0.1",
          "accept-language": "fr,en;q=0.8",
        },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        if (redirects === MAX_REDIRECTS) {
          return {
            evidence: { requestedUrl, finalUrl: current.toString(), status: response.status, contentType: response.headers.get("content-type"), bytesRead: 0, truncated: false, error: "redirect_limit_reached" },
            body: "",
            headers: Object.fromEntries(response.headers.entries()),
          };
        }
        const next = new URL(location, current);
        if (next.protocol !== "https:" || !sameSite(next.hostname, domain)) {
          return {
            evidence: { requestedUrl, finalUrl: current.toString(), status: response.status, contentType: response.headers.get("content-type"), bytesRead: 0, truncated: false, error: "external_or_non_https_redirect_blocked" },
            body: "",
            headers: Object.fromEntries(response.headers.entries()),
          };
        }
        current = next;
        continue;
      }

      const { text, bytesRead, truncated } = await readLimited(response);
      return {
        evidence: {
          requestedUrl,
          finalUrl: current.toString(),
          status: response.status,
          contentType: response.headers.get("content-type"),
          bytesRead,
          truncated,
          error: null,
        },
        body: text,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      return {
        evidence: {
          requestedUrl,
          finalUrl: current.toString(),
          status: null,
          contentType: null,
          bytesRead: 0,
          truncated: false,
          error: error instanceof Error ? error.name : "fetch_error",
        },
        body: "",
        headers: {},
      };
    }
  }

  throw new Error("unreachable redirect state");
}

function robotsStatus(evidence: HttpEvidence): SourcePolicyEvidenceReview["robots"]["status"] {
  if (evidence.status === 404 || evidence.status === 410) return "MISSING";
  if (evidence.status === 401 || evidence.status === 403 || evidence.status === 429) return "BLOCKED";
  if (evidence.status != null && evidence.status >= 200 && evidence.status < 300) return "PRESENT";
  return "UNAVAILABLE";
}

function legalEvidenceFromFetch(fetchResult: FetchResult, source: LegalEvidenceSource): LegalEvidencePage {
  const successful = fetchResult.evidence.status != null && fetchResult.evidence.status >= 200 && fetchResult.evidence.status < 300;
  const textual = /(?:text\/html|text\/plain|application\/xhtml\+xml)/i.test(fetchResult.evidence.contentType ?? "") || !fetchResult.evidence.contentType;
  const signals = successful && textual ? detectPolicySignals(fetchResult.body) : { restrictive: [], publicChannel: [], protectedContent: [] };
  const signalIds = [
    ...signals.restrictive.map((id) => `restrictive:${id}`),
    ...signals.publicChannel.map((id) => `public_channel:${id}`),
    ...signals.protectedContent.map((id) => `protected_content:${id}`),
  ].sort();
  return {
    requestedUrl: fetchResult.evidence.requestedUrl,
    finalUrl: fetchResult.evidence.finalUrl,
    status: fetchResult.evidence.status,
    contentType: fetchResult.evidence.contentType,
    bytesRead: fetchResult.evidence.bytesRead,
    bodySha256: successful && fetchResult.body ? createHash("sha256").update(fetchResult.body).digest("hex") : null,
    source,
    signalIds,
    error: fetchResult.evidence.error,
  };
}

async function assertStillUnregistered(domains: string[]): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("DATA-1.6A requires Supabase read-only credentials for Registry preflight");
  const url = new URL("/rest/v1/source_policy_registry", supabaseUrl);
  url.searchParams.set("select", "source_domain");
  url.searchParams.set("source_domain", `in.(${domains.join(",")})`);
  const response = await fetch(url, {
    method: "GET",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source Registry preflight failed with HTTP ${response.status}`);
  const rows = (await response.json()) as Array<{ source_domain?: string }>;
  const registered = rows.map((row) => row.source_domain).filter((value): value is string => Boolean(value));
  if (registered.length > 0) throw new Error(`DATA-1.6A seed contains domains now present in Source Registry: ${registered.sort().join(", ")}`);
}

async function auditDomain(technicalAudit: TechnicalCapabilityAudit): Promise<SourcePolicyEvidenceReview> {
  const domain = normalizePolicyAuditDomain(technicalAudit.seed.domain);
  const budget = { count: 0 };
  const robotsUrl = `https://${domain}/robots.txt`;
  const robotsFetch = await fetchBounded(robotsUrl, domain, budget);
  const status = robotsStatus(robotsFetch.evidence);
  let parsedRobots: ParsedRobots | null = null;
  if (status === "PRESENT") parsedRobots = parseRobots(robotsFetch.body);
  const disallowAll = parsedRobots ? !isRobotsPathAllowed(parsedRobots, "/", USER_AGENT) : technicalAudit.robots.disallowAll;

  let homepageFetch: FetchResult | null = null;
  let homepageNoindex = technicalAudit.homepage.noindex;
  let homepageAccessControl = technicalAudit.homepage.accessControlSignal;
  const mayFetchHomepage = !disallowAll && status !== "BLOCKED" && status !== "UNAVAILABLE" && (!parsedRobots || isRobotsPathAllowed(parsedRobots, "/", USER_AGENT));
  if (mayFetchHomepage) {
    homepageFetch = await fetchBounded(`https://${domain}/`, domain, budget);
    if (homepageFetch.evidence.status != null && homepageFetch.evidence.status >= 200 && homepageFetch.evidence.status < 300) {
      homepageNoindex = detectNoindex(homepageFetch.body, homepageFetch.headers);
      homepageAccessControl = detectAccessControl(homepageFetch.body, homepageFetch.evidence.finalUrl);
    }
  }

  const legalPages: LegalEvidencePage[] = [];
  if (homepageFetch && !homepageNoindex && !homepageAccessControl && homepageFetch.evidence.status != null && homepageFetch.evidence.status >= 200 && homepageFetch.evidence.status < 300) {
    const discovered = extractSameSiteLegalLinks(homepageFetch.body, homepageFetch.evidence.finalUrl ?? `https://${domain}/`, domain);
    const candidates = discovered.length > 0 ? discovered : standardLegalUrls(domain);
    for (const candidate of candidates) {
      if (legalPages.length >= 3 || budget.count >= MAX_REQUESTS_PER_DOMAIN) break;
      let pathname = "/";
      try {
        pathname = new URL(candidate).pathname || "/";
      } catch {
        continue;
      }
      if (parsedRobots && !isRobotsPathAllowed(parsedRobots, pathname, USER_AGENT)) {
        legalPages.push({
          requestedUrl: candidate,
          finalUrl: null,
          status: null,
          contentType: null,
          bytesRead: 0,
          bodySha256: null,
          source: discovered.length > 0 ? "HOMEPAGE_LINK" : "STANDARD_PUBLIC_PATH",
          signalIds: [],
          error: "robots_disallow_path",
        });
        continue;
      }
      const fetched = await fetchBounded(candidate, domain, budget);
      legalPages.push(legalEvidenceFromFetch(fetched, discovered.length > 0 ? "HOMEPAGE_LINK" : "STANDARD_PUBLIC_PATH"));
    }
  }

  return buildSourcePolicyEvidenceReview({
    technicalAudit,
    generatedAt: new Date().toISOString(),
    requestCount: budget.count,
    robots: { status, disallowAll, evidenceUrl: robotsFetch.evidence.finalUrl ?? robotsUrl },
    homepage: {
      status: homepageFetch?.evidence.status ?? null,
      noindex: homepageNoindex,
      accessControlSignal: homepageAccessControl,
      evidenceUrl: homepageFetch?.evidence.finalUrl ?? null,
      error: homepageFetch?.evidence.error ?? (mayFetchHomepage ? null : "homepage_not_fetched_fail_closed"),
    },
    legalPages,
  });
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  if (!Number.isInteger(sourceRunId) || sourceRunId <= 0) throw new Error("Invalid DATA-1.5 evidence run id");
  const input = JSON.parse(await fs.readFile(inputPath, "utf8")) as { audits?: TechnicalCapabilityAudit[] };
  const audits = validateTechnicalAuditsForPolicyReview(input.audits ?? []);
  if (audits.length !== 19) throw new Error(`Expected 19 CAPABILITY_REVIEW_READY sources from certified DATA-1.5, got ${audits.length}`);
  const domains = audits.map((audit) => normalizePolicyAuditDomain(audit.seed.domain));
  await assertStillUnregistered(domains);

  const reviews: SourcePolicyEvidenceReview[] = [];
  for (const audit of audits) {
    reviews.push(await auditDomain(audit));
    await sleep(DOMAIN_PAUSE_MS);
  }
  reviews.sort((a, b) => a.seedRank - b.seedRank);

  const totalRequests = reviews.reduce((sum, review) => sum + review.requestCount, 0);
  const proof = {
    schemaVersion: "data-1-6a-source-policy-evidence-proof-v1",
    generatedAt: new Date().toISOString(),
    sourceTechnicalAuditRunId: sourceRunId,
    readOnly: true,
    writesPerformed: 0,
    policiesAssigned: reviews.filter((review) => review.policyAssignment !== null).length,
    registryCandidateFieldsAssigned: reviews.filter((review) => Object.values(review.registryDraft).some((value) => value !== null)).length,
    authAttempts: 0,
    bypassAttempts: 0,
    warcFetches: 0,
    registryReadRequests: 1,
    sourceCount: reviews.length,
    totalRequests,
    maxRequestsPerDomainConfigured: MAX_REQUESTS_PER_DOMAIN,
    maxRequestsPerDomainObserved: Math.max(...reviews.map((review) => review.requestCount)),
    restrictiveTermsFound: reviews.filter((review) => review.evidenceStatus === "RESTRICTIVE_TERMS_FOUND").length,
    termsWithoutExplicitPermission: reviews.filter((review) => review.evidenceStatus === "TERMS_FOUND_NO_EXPLICIT_PERMISSION").length,
    publicChannelSignals: reviews.filter((review) => review.evidenceStatus === "PUBLIC_CHANNEL_SIGNAL_FOUND").length,
    insufficientLegalEvidence: reviews.filter((review) => review.evidenceStatus === "INSUFFICIENT_LEGAL_EVIDENCE").length,
    robotsBlockAll: reviews.filter((review) => review.evidenceStatus === "ROBOTS_BLOCK_ALL").length,
    noindexObserved: reviews.filter((review) => review.evidenceStatus === "NOINDEX_OBSERVED").length,
    accessOrFetchLimited: reviews.filter((review) => review.evidenceStatus === "ACCESS_OR_FETCH_LIMITED").length,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "source-policy-evidence-review.json"), `${JSON.stringify({ source: { lot: "DATA-1.5", workflowRunId: sourceRunId }, reviews }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "source-policy-evidence-review.md"), renderSourcePolicyEvidenceMarkdown(reviews));
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);

  const rows = [
    ["seed_rank", "domain", "evidence_status", "confidence", "review_track", "contact_required", "legal_pages_2xx", "restrictive_signals", "public_channel_signals", "technical_family", "technical_score", "requests"],
    ...reviews.map((review) => [
      review.seedRank,
      review.domain,
      review.evidenceStatus,
      review.evidenceConfidenceScore,
      review.reviewTrack,
      review.contactRequired,
      review.legalPages.filter((page) => page.status != null && page.status >= 200 && page.status < 300).length,
      review.restrictiveSignalIds.join("|"),
      review.publicChannelSignalIds.join("|"),
      review.technicalCapability.connectorFamilyCandidate,
      review.technicalCapability.score,
      review.requestCount,
    ]),
  ];
  await fs.writeFile(path.join(outDir, "policy-review-queue.csv"), `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

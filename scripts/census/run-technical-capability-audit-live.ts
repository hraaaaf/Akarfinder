import fs from "node:fs/promises";
import path from "node:path";

import {
  buildTechnicalAudit,
  detectCmsFamily,
  isRobotsPathAllowed,
  normalizeAuditDomain,
  parseRobots,
  renderTechnicalAuditMarkdown,
  robotsDisallowAll,
  validateCandidateSeed,
  type CandidateSeed,
  type HttpEvidence,
  type ParsedRobots,
  type TechnicalCapabilityAudit,
} from "./technical-capability-audit";

type SeedFile = {
  schemaVersion: string;
  source: Record<string, unknown>;
  candidates: CandidateSeed[];
};

type FetchResult = { evidence: HttpEvidence; text: string; headers: Record<string, string> };

const USER_AGENT = "AkarFinder-Technical-Audit/1.0 (+https://akarfinder.vercel.app; public metadata only; no bypass)";
const MAX_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REQUESTS_PER_DOMAIN = 8;
const DOMAIN_PAUSE_MS = 250;
const MAX_SITEMAP_FETCHES = 4;
const seedPath = process.env.DATA_1_5_SEED ?? "scripts/census/data-1-5-seed.json";
const outDir = process.env.DATA_1_5_OUT_DIR ?? ".tmp/data-1-5/results";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
}

function safeHeaders(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  for (const key of ["content-type", "link", "x-robots-tag", "server", "x-generator"]) {
    const value = headers.get(key);
    if (value) output[key] = value.slice(0, 2_000);
  }
  return output;
}

async function readLimitedText(response: Response): Promise<{ text: string; bytesRead: number; truncated: boolean }> {
  if (!response.body) return { text: "", bytesRead: 0, truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = MAX_BYTES - bytesRead;
    if (remaining <= 0) {
      truncated = true;
      await reader.cancel();
      break;
    }
    if (value.byteLength <= remaining) {
      chunks.push(value);
      bytesRead += value.byteLength;
    } else {
      chunks.push(value.slice(0, remaining));
      bytesRead += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  const merged = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(merged), bytesRead, truncated };
}

async function rawFetch(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/json;q=0.9,*/*;q=0.5",
      },
    });
    const body = await readLimitedText(response);
    return {
      evidence: {
        requestedUrl: url,
        finalUrl: response.url || url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        bytesRead: body.bytesRead,
        truncated: body.truncated,
        error: null,
      },
      text: body.text,
      headers: safeHeaders(response.headers),
    };
  } catch (error) {
    return {
      evidence: {
        requestedUrl: url,
        finalUrl: null,
        status: null,
        contentType: null,
        bytesRead: 0,
        truncated: false,
        error: cleanError(error),
      },
      text: "",
      headers: {},
    };
  } finally {
    clearTimeout(timeout);
  }
}

function canonicalHost(value: string): string | null {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

function isSameSite(url: string, domain: string): boolean {
  return canonicalHost(url) === normalizeAuditDomain(domain);
}

function statusClass(status: number | null): "PRESENT" | "MISSING" | "BLOCKED" | "UNAVAILABLE" {
  if (status === 200) return "PRESENT";
  if (status === 404 || status === 410) return "MISSING";
  if (status === 401 || status === 403 || status === 429) return "BLOCKED";
  return "UNAVAILABLE";
}

function extractSitemapChildren(xml: string): string[] {
  if (!/<sitemapindex\b/i.test(xml)) return [];
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]!.trim());
}

function pathAllowed(parsed: ParsedRobots | null, url: string): boolean {
  if (!parsed) return true;
  try {
    const parsedUrl = new URL(url);
    return isRobotsPathAllowed(parsed, `${parsedUrl.pathname}${parsedUrl.search}`);
  } catch {
    return false;
  }
}

async function auditDomain(seed: CandidateSeed): Promise<TechnicalCapabilityAudit> {
  let requestCount = 0;
  const boundedFetch = async (url: string): Promise<FetchResult | null> => {
    if (requestCount >= MAX_REQUESTS_PER_DOMAIN) return null;
    requestCount += 1;
    return rawFetch(url);
  };

  const domain = normalizeAuditDomain(seed.domain);
  let origin = `https://${domain}`;
  let robotsFetch = await boundedFetch(`${origin}/robots.txt`);
  if (robotsFetch?.evidence.status == null) {
    const wwwOrigin = `https://www.${domain}`;
    const fallback = await boundedFetch(`${wwwOrigin}/robots.txt`);
    if (fallback?.evidence.status != null) {
      robotsFetch = fallback;
      origin = wwwOrigin;
    }
  }
  if (!robotsFetch) throw new Error(`${domain}: request budget exhausted before robots`);

  const robotsStatus = statusClass(robotsFetch.evidence.status);
  const parsedRobots = robotsStatus === "PRESENT" ? parseRobots(robotsFetch.text) : null;
  const stopOnRobots = robotsStatus === "BLOCKED" || robotsStatus === "UNAVAILABLE" || (parsedRobots ? robotsDisallowAll(parsedRobots) : false);

  let homepageFetch: FetchResult | null = null;
  let homepageHtml = "";
  let homepageHeaders: Record<string, string> = {};
  const homepageUrl = `${origin}/`;
  if (!stopOnRobots && pathAllowed(parsedRobots, homepageUrl)) {
    homepageFetch = await boundedFetch(homepageUrl);
    if (homepageFetch) {
      homepageHtml = homepageFetch.text;
      homepageHeaders = homepageFetch.headers;
      if (homepageFetch.evidence.finalUrl) {
        try { origin = new URL(homepageFetch.evidence.finalUrl).origin; } catch { /* keep prior origin */ }
      }
    }
  }

  const preliminaryCms = detectCmsFamily(homepageHtml, homepageHeaders);
  const homepageBlocked = !homepageFetch || homepageFetch.evidence.status == null || homepageFetch.evidence.status < 200 || homepageFetch.evidence.status >= 400;
  const noindex = /(?:name\s*=\s*["']robots["'][^>]+content\s*=\s*["'][^"']*noindex|content\s*=\s*["'][^"']*noindex[^"']*["'][^>]+name\s*=\s*["']robots["'])/i.test(homepageHtml)
    || /noindex/i.test(homepageHeaders["x-robots-tag"] ?? "");
  const accessControlled = /(captcha|verify you are human|access denied|cloudflare)/i.test(homepageHtml.slice(0, 200_000));
  const allowMetadataProbes = !stopOnRobots && !homepageBlocked && !noindex && !accessControlled;

  const sitemapEvidence: HttpEvidence[] = [];
  const sitemapBodies: string[] = [];
  if (allowMetadataProbes) {
    const candidates = new Set<string>();
    for (const value of parsedRobots?.sitemapUrls ?? []) {
      if (isSameSite(value, domain) && pathAllowed(parsedRobots, value)) candidates.add(value);
    }
    for (const suffix of ["/sitemap.xml", "/sitemap_index.xml"]) {
      const value = `${origin}${suffix}`;
      if (pathAllowed(parsedRobots, value)) candidates.add(value);
    }
    if (preliminaryCms === "WORDPRESS" || preliminaryCms === "HOUZEZ" || preliminaryCms === "REALHOMES") {
      const value = `${origin}/wp-sitemap.xml`;
      if (pathAllowed(parsedRobots, value)) candidates.add(value);
    }

    const queue = [...candidates];
    const seen = new Set<string>();
    while (queue.length > 0 && sitemapEvidence.length < MAX_SITEMAP_FETCHES && requestCount < MAX_REQUESTS_PER_DOMAIN) {
      const value = queue.shift()!;
      if (seen.has(value) || !isSameSite(value, domain) || !pathAllowed(parsedRobots, value)) continue;
      seen.add(value);
      const fetched = await boundedFetch(value);
      if (!fetched) break;
      sitemapEvidence.push(fetched.evidence);
      if (fetched.evidence.status === 200 && /xml|text\//i.test(fetched.evidence.contentType ?? "")) {
        sitemapBodies.push(fetched.text);
        for (const child of extractSitemapChildren(fetched.text).slice(0, 2)) {
          if (isSameSite(child, domain) && pathAllowed(parsedRobots, child) && !seen.has(child)) queue.push(child);
        }
      }
    }
  }

  let wpJsonFetch: FetchResult | null = null;
  if (allowMetadataProbes && (preliminaryCms === "WORDPRESS" || preliminaryCms === "HOUZEZ" || preliminaryCms === "REALHOMES")) {
    const wpJsonUrl = `${origin}/wp-json/`;
    if (pathAllowed(parsedRobots, wpJsonUrl)) wpJsonFetch = await boundedFetch(wpJsonUrl);
  }

  return buildTechnicalAudit({
    seed,
    generatedAt: new Date().toISOString(),
    requestCount,
    robotsEvidence: robotsFetch.evidence,
    robotsStatus,
    parsedRobots,
    homepageEvidence: homepageFetch?.evidence ?? null,
    homepageHtml,
    homepageHeaders,
    sitemapEvidence,
    sitemapBodies,
    wpJsonEvidence: wpJsonFetch?.evidence ?? null,
    wpJsonBody: wpJsonFetch?.text ?? "",
  });
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const seedFile = JSON.parse(await fs.readFile(seedPath, "utf8")) as SeedFile;
  if (seedFile.schemaVersion !== "data-1-5-candidate-seed-v1") throw new Error(`Unexpected seed schema: ${seedFile.schemaVersion}`);
  const candidates = validateCandidateSeed(seedFile.candidates);
  const audits: TechnicalCapabilityAudit[] = [];
  for (const candidate of candidates) {
    audits.push(await auditDomain(candidate));
    await sleep(DOMAIN_PAUSE_MS);
  }

  const totalRequests = audits.reduce((sum, audit) => sum + audit.requestCount, 0);
  const maxRequestsPerDomainObserved = Math.max(...audits.map((audit) => audit.requestCount));
  const proof = {
    schemaVersion: "data-1-5-technical-capability-proof-v1",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writesPerformed: 0,
    effectivePoliciesAssigned: audits.filter((audit) => audit.effectivePolicyCandidate !== null).length,
    authAttempts: 0,
    bypassAttempts: 0,
    warcFetches: 0,
    seedCount: candidates.length,
    sitesAudited: audits.length,
    totalRequests,
    maxRequestsPerDomainConfigured: MAX_REQUESTS_PER_DOMAIN,
    maxRequestsPerDomainObserved,
    robotsBlockAll: audits.filter((audit) => audit.robots.disallowAll).length,
    robotsBlockedOrUnavailable: audits.filter((audit) => audit.robots.status === "BLOCKED" || audit.robots.status === "UNAVAILABLE").length,
    noindex: audits.filter((audit) => audit.homepage.noindex).length,
    accessControlSignals: audits.filter((audit) => audit.homepage.accessControlSignal).length,
    capabilityReviewReady: audits.filter((audit) => audit.technicalGate === "CAPABILITY_REVIEW_READY").length,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "technical-capability-audit.json"), `${JSON.stringify({ seed: seedFile.source, audits }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "technical-capability-audit.md"), renderTechnicalAuditMarkdown(audits));
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);

  const rows = [
    ["seed_rank", "domain", "capability_score", "cms", "connector_family_candidate", "technical_gate", "robots_status", "robots_disallow_all", "sitemap_locs", "listing_signals", "json_ld", "wp_rest_public", "requests"],
    ...[...audits]
      .sort((a, b) => b.capabilityScore - a.capabilityScore || a.seed.rank - b.seed.rank)
      .map((audit) => [
        audit.seed.rank,
        audit.seed.domain,
        audit.capabilityScore,
        audit.cms,
        audit.connectorFamilyCandidate,
        audit.technicalGate,
        audit.robots.status,
        audit.robots.disallowAll,
        audit.sitemaps.locCount,
        audit.sitemaps.listingLocCount + audit.homepage.listingLinkCount,
        audit.structuredData.hasJsonLd,
        audit.wpJson.public,
        audit.requestCount,
      ]),
  ];
  await fs.writeFile(path.join(outDir, "capability-ranking.csv"), `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

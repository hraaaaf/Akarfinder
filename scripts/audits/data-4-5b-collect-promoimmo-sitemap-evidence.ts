import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PROMOIMMO_CHANNEL,
  PROMOIMMO_DOMAIN,
  canonicalizePromoImmoUrl,
  extractPromoImmoRobotsSitemaps,
  parsePromoImmoSitemapXml,
  samePromoImmoOrigin,
} from "../data4/promoimmo-sitemap-canary";
import type { CurrentSitemapEvidence } from "../data4/promoimmo-controlled-expansion-write";

const OUT_DIR = process.env.DATA_4_5B_EVIDENCE_OUT_DIR ?? ".tmp/data-4-5b/source-evidence";
const MAX_SOURCE_REQUESTS = 40;
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
let sourceRequests = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10_000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(Math.max(0, date - Date.now()), 10_000) : null;
}

async function fetchSourceText(urlString: string): Promise<string> {
  if (!samePromoImmoOrigin(urlString)) throw new Error(`DATA-4.5B disallowed source URL: ${urlString}`);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    sourceRequests += 1;
    if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.5B source request budget exceeded");
    try {
      const response = await fetch(urlString, {
        redirect: "follow",
        headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.5B; sitemap-only; no-detail-fetch)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!samePromoImmoOrigin(response.url)) throw new Error(`DATA-4.5B redirect left allowed origin: ${response.url}`);
      if (response.ok) return response.text();
      const body = await response.text();
      if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`DATA-4.5B source read failed status=${response.status} url=${urlString}: ${body.slice(0, 300)}`);
      }
      await sleep(retryAfterMs(response) ?? 500 * 2 ** (attempt - 1));
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`DATA-4.5B exhausted retries: ${urlString}`);
}

async function main(): Promise<void> {
  const observedAt = new Date().toISOString();
  const robotsCandidates = [
    `https://${PROMOIMMO_DOMAIN}/robots.txt`,
    `https://www.${PROMOIMMO_DOMAIN}/robots.txt`,
  ];
  let robotsText: string | null = null;
  let lastError: unknown = null;
  for (const robotsUrl of robotsCandidates) {
    try {
      robotsText = await fetchSourceText(robotsUrl);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!robotsText) throw new Error(`DATA-4.5B robots unavailable from direct environment: ${String(lastError)}`);

  const queue = [...extractPromoImmoRobotsSitemaps(robotsText)];
  if (queue.length === 0) throw new Error("DATA-4.5B robots declares no same-origin sitemap");
  const visited = new Set<string>();
  const sitemapByUrl = new Map<string, string>();

  while (queue.length > 0) {
    const raw = queue.shift()!;
    const sitemapUrl = canonicalizePromoImmoUrl(raw);
    if (!sitemapUrl || visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parsePromoImmoSitemapXml(await fetchSourceText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.5B unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) sitemapByUrl.set(canonicalUrl, sitemapUrl);
    }
  }

  if (sitemapByUrl.size === 0) throw new Error("DATA-4.5B empty current sitemap population");
  const evidence: CurrentSitemapEvidence = {
    schemaVersion: "data-4-5b-promoimmo-current-sitemap-evidence-v1",
    sourceDomain: PROMOIMMO_DOMAIN,
    channel: PROMOIMMO_CHANNEL,
    observedAt,
    collector: "data-4-5b-direct-sitemap-collector-v1",
    sourceSiteDetailRequests: 0,
    rows: [...sitemapByUrl.entries()]
      .map(([canonicalUrl, sitemapUrl]) => ({ canonicalUrl, sitemapUrl }))
      .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl)),
  };
  const json = `${JSON.stringify(evidence, null, 2)}\n`;
  const digest = crypto.createHash("sha256").update(json).digest("hex");
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "current-sitemap-evidence.json"), json);
  await fs.writeFile(path.join(OUT_DIR, "current-sitemap-evidence.sha256"), `${digest}  current-sitemap-evidence.json\n`);
  await fs.writeFile(path.join(OUT_DIR, "collector-proof.json"), `${JSON.stringify({
    schemaVersion: "data-4-5b-promoimmo-current-sitemap-collector-proof-v1",
    sourceDomain: PROMOIMMO_DOMAIN,
    observedAt,
    sourceRequests,
    sourceSiteDetailRequests: 0,
    sitemapDocumentsRead: visited.size,
    currentSitemapUrlCount: sitemapByUrl.size,
    evidenceSha256: digest,
    databaseWrites: 0,
    registryMutations: 0,
    policyChanges: 0,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ observedAt, sourceRequests, sitemapDocumentsRead: visited.size, currentSitemapUrlCount: sitemapByUrl.size, evidenceSha256: digest }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

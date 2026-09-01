import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  discoverCommonCrawlOpenWeb,
  DEFAULT_TOP_DOMAINS,
} from './commoncrawl-open-web-mesh.mjs';

export const SINGLE_QUERY_FAMILY = {
  name: 'immo',
  pattern: '*.ma/*immo*',
};

export async function runSingleQueryDiscovery() {
  return discoverCommonCrawlOpenWeb({
    families: [SINGLE_QUERY_FAMILY],
    queryLimit: 1000,
  });
}

export async function runCli() {
  const result = await runSingleQueryDiscovery();
  const ccQueries = result.requests.filter((request) => request.role.startsWith('commoncrawl:') && request.role !== 'commoncrawl:collections');
  const successfulQueryCount = ccQueries.filter((request) => request.classification === 'ok').length;
  const report = {
    startedAt: new Date().toISOString(),
    strategy: 'single-broad-query',
    family: SINGLE_QUERY_FAMILY,
    crawl: result.crawl,
    zeroDbWrites: result.zeroDbWrites,
    stoppedEarly: result.stoppedEarly,
    successfulQueryCount,
    queryCount: ccQueries.length,
    netNewDomainCount: result.domains.length,
    selectedDomainCount: Math.min(result.domains.length, DEFAULT_TOP_DOMAINS),
    candidateUrlCount: result.candidateUrls.length,
    topDomains: result.domains.slice(0, DEFAULT_TOP_DOMAINS).map((domain) => ({
      host: domain.host,
      score: domain.score,
      urlCount: domain.urlCount,
      familyCount: domain.familyCount,
      families: domain.families,
      signals: domain.signals,
    })),
    sitemapEvidence: result.sitemapEvidence,
    requests: result.requests,
    sample: result.candidateUrls.slice(0, 100),
  };

  report.success = Boolean(
    report.crawl &&
    report.zeroDbWrites &&
    !String(report.stoppedEarly || '').startsWith('http_429') &&
    report.successfulQueryCount === 1 &&
    report.netNewDomainCount >= 3 &&
    report.candidateUrlCount >= 50
  );

  const outDir = 'artifacts/morocco-web-l3-commoncrawl';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# L3 Common Crawl Open-Web Mesh — single broad query strategy',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Strategy: **${report.strategy}**`,
    `- Crawl: **${report.crawl || 'none'}**`,
    `- Common Crawl queries: **${report.successfulQueryCount}/${report.queryCount} ok**`,
    `- Net-new ranked .ma domains: **${report.netNewDomainCount}**`,
    `- Candidate URLs: **${report.candidateUrlCount}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    '## Top domains',
    ...report.topDomains.map((item) => `- ${item.host} — score ${item.score} — ${item.urlCount} URLs`),
    '',
    '## Requests',
    ...report.requests.map((item) => `- ${item.classification} — ${item.status} — ${item.role} — ${item.url}`),
  ].join('\n'));

  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();

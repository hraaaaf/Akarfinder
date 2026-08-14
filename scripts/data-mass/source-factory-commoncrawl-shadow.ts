#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalizeSourceUrl, extractDomain } from '@/lib/openserp-ingestion/utils';
import { classifyReservoirCandidate } from '@/scripts/data-mass/reservoir-qualification';

const INDEXES = ['CC-MAIN-2026-25','CC-MAIN-2025-51','CC-MAIN-2025-30'];
const LIMIT = 5000;
const UA = 'AkarFinder-MASS-X5-Shadow/1.0';
const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));

type Report = { sourceFactory?: Array<{ sourceDomain?: string }> };

async function fetchUrls(domain:string,index:string):Promise<string[]> {
  const url = `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url&limit=${LIMIT}`;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const response = await fetch(url,{headers:{'User-Agent':UA,Accept:'application/json,text/plain;q=0.9,*/*;q=0.1'}});
      if (response.status === 404) return [];
      if (!response.ok) {
        if (attempt === 3 || ![429,500,502,503,504].includes(response.status)) throw new Error(`HTTP ${response.status}`);
        await sleep(1000 * 2 ** (attempt-1));
        continue;
      }
      const text = await response.text();
      return text.split('\n').filter(Boolean).flatMap(line => {
        try { const row = JSON.parse(line) as {url?:string}; return row.url ? [row.url] : []; } catch { return []; }
      });
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(1000 * 2 ** (attempt-1));
    }
  }
  return [];
}

async function main() {
  const reportPath = process.argv[2];
  if (!reportPath) throw new Error('Usage: source-factory-commoncrawl-shadow.ts <mass1-report.json>');
  const report = JSON.parse(readFileSync(reportPath,'utf8')) as Report;
  const domains = [...new Set((report.sourceFactory ?? []).map(r => String(r.sourceDomain ?? '').trim().toLowerCase()).filter(Boolean))].sort();
  if (domains.length !== 107) throw new Error(`Expected certified MASS-1 Source Factory snapshot of 107 domains, got ${domains.length}`);

  const rows = new Map<string,unknown>();
  const perDomain:Array<Record<string,unknown>> = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  for (const domain of domains) {
    const raw = new Set<string>();
    const failures:string[] = [];
    for (const index of INDEXES) {
      try {
        for (const url of await fetchUrls(domain,index)) raw.add(url);
        successfulRequests++;
      } catch (error) {
        failedRequests++;
        failures.push(`${index}:${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(500);
    }

    let canonical = 0, moroccoRealEstate = 0, likelyDetail = 0;
    for (const rawUrl of raw) {
      if (extractDomain(rawUrl) !== domain) continue;
      const url = canonicalizeSourceUrl(rawUrl);
      if (!url) continue;
      canonical++;
      const classification = classifyReservoirCandidate({sourceDomain:domain,url});
      if (classification.likelyRealEstate && classification.geographyScope === 'MOROCCO_LIKELY') {
        moroccoRealEstate++;
        if (classification.pageKind === 'LIKELY_LISTING_DETAIL') likelyDetail++;
        rows.set(url,{sourceDomain:domain,url,classification,publicActivableNow:false,permissionInferred:false});
      }
    }
    perDomain.push({domain,rawUniqueUrls:raw.size,canonicalUrls:canonical,likelyMoroccoRealEstateUrls:moroccoRealEstate,likelyListingDetailUrls:likelyDetail,failures});
    console.log(`[mass-x5] ${domain}: raw=${raw.size} moroccoRE=${moroccoRealEstate} detail=${likelyDetail}`);
  }

  const outDir = join(process.cwd(),'.tmp','data-mass-x5');
  mkdirSync(outDir,{recursive:true});
  const candidates = [...rows.values()];
  writeFileSync(join(outDir,'candidates.jsonl'),candidates.map(row=>JSON.stringify(row)).join('\n') + (candidates.length ? '\n' : ''),'utf8');
  const summary = {schemaVersion:'MASS_X5_SOURCE_FACTORY_COMMONCRAWL_SHADOW_V1',mode:'shadow_read_only',sourceFactoryDomains:domains.length,indexes:INDEXES,successfulRequests,failedRequests,candidateUrlRepresentations:candidates.length,publicActivableNow:false,databaseAccess:0,databaseWrites:0,sourcePageFetches:0,warcDownloads:0,permissionsInferred:0,perDomain};
  writeFileSync(join(outDir,'summary.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  console.log(JSON.stringify(summary,null,2));
  if (successfulRequests === 0) throw new Error('Common Crawl unavailable: zero successful requests');
}

main().catch(error => { console.error(error instanceof Error ? error.stack : String(error)); process.exit(1); });

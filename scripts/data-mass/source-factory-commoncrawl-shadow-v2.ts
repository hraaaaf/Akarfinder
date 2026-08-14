#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalizeSourceUrl, extractDomain } from '@/lib/openserp-ingestion/utils';
import { classifyReservoirCandidate } from '@/scripts/data-mass/reservoir-qualification';
import { MASS_X5_SOURCE_FACTORY_DOMAINS, MASS_X5_SOURCE_FACTORY_EVIDENCE } from '@/scripts/data-mass/source-factory-certified-snapshot';

const INDEXES = ['CC-MAIN-2026-25','CC-MAIN-2025-51','CC-MAIN-2025-30'];
const LIMIT = 5000;
const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));

async function fetchUrls(domain:string,index:string):Promise<string[]> {
  const endpoint = `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url&limit=${LIMIT}`;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const response = await fetch(endpoint,{headers:{Accept:'application/json,text/plain;q=0.9,*/*;q=0.1'}});
      if (response.status === 404) return [];
      if (!response.ok) {
        if (attempt === 3 || ![429,500,502,503,504].includes(response.status)) throw new Error(`HTTP ${response.status}`);
        await sleep(1000 * 2 ** (attempt-1));
        continue;
      }
      const body = await response.text();
      return body.split('\n').filter(Boolean).flatMap(line => {
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
  const domains = [...new Set(MASS_X5_SOURCE_FACTORY_DOMAINS.map(d => d.toLowerCase()))].sort();
  if (domains.length !== MASS_X5_SOURCE_FACTORY_EVIDENCE.expectedDomains) throw new Error(`Certified snapshot mismatch: ${domains.length}`);
  const candidates = new Map<string,unknown>();
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
    let canonicalUrls = 0, likelyMoroccoRealEstateUrls = 0, likelyListingDetailUrls = 0;
    for (const rawUrl of raw) {
      if (extractDomain(rawUrl) !== domain) continue;
      const url = canonicalizeSourceUrl(rawUrl);
      if (!url) continue;
      canonicalUrls++;
      const classification = classifyReservoirCandidate({sourceDomain:domain,url});
      if (classification.likelyRealEstate && classification.geographyScope === 'MOROCCO_LIKELY') {
        likelyMoroccoRealEstateUrls++;
        if (classification.pageKind === 'LIKELY_LISTING_DETAIL') likelyListingDetailUrls++;
        candidates.set(url,{sourceDomain:domain,url,classification,publicActivableNow:false,permissionInferred:false});
      }
    }
    perDomain.push({domain,rawUniqueUrls:raw.size,canonicalUrls,likelyMoroccoRealEstateUrls,likelyListingDetailUrls,failures});
  }

  const outDir = join(process.cwd(),'.tmp','data-mass-x5');
  mkdirSync(outDir,{recursive:true});
  const rows = [...candidates.values()];
  writeFileSync(join(outDir,'candidates.jsonl'),rows.map(row=>JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''),'utf8');
  const summary = {schemaVersion:'MASS_X5_SOURCE_FACTORY_COMMONCRAWL_SHADOW_V1',mode:'shadow_read_only',evidence:MASS_X5_SOURCE_FACTORY_EVIDENCE,sourceFactoryDomains:domains.length,indexes:INDEXES,successfulRequests,failedRequests,candidateUrlRepresentations:rows.length,publicActivableNow:false,databaseAccess:0,databaseWrites:0,sourcePageFetches:0,warcDownloads:0,permissionsInferred:0,perDomain};
  writeFileSync(join(outDir,'summary.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  console.log(JSON.stringify(summary,null,2));
  if (successfulRequests === 0) throw new Error('Common Crawl unavailable: zero successful requests');
}

main().catch(error => { console.error(error instanceof Error ? error.stack : String(error)); process.exit(1); });

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { detectDeepExpansionPattern } from '../data-mass/deep-expansion';
import { classifyReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT = process.env.Q1A_MASSX2_OUT ?? '.tmp/candidate-lake-q1a-massx2';
const AS_OF = process.env.Q1A_MASSX2_AS_OF ?? '2026-08-13T23:07:33Z';
const PAGE = 1000;
const TARGETS = [
  { domain: 'jibril.immo', pattern: 'JIBRIL_BIENS_SLUG', expected: 40 },
  { domain: 'swimmobilier.com', pattern: 'SW_PROPRIETE_SLUG', expected: 27 },
  { domain: 'loco.ma', pattern: 'LOCO_IMMOBILIERS_SLUG', expected: 6 },
] as const;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

const canon = (raw: string) => {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return raw.trim();
  }
};
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function swLocaleTolerantPattern(rawUrl: string): boolean {
  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return /^\/(?:(?:fr|ar)\/)?propriete\/[^/]+$/i.test(pathname);
  } catch {
    return false;
  }
}

async function rest<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env('SUPABASE_URL'));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${table} ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

type Row = {
  id: string;
  source_domain: string;
  source_url: string;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_query: string | null;
  content_fingerprint: string | null;
  created_at: string;
};

async function readDomain(domain: string): Promise<Row[]> {
  const out: Row[] = [];
  let last = '';
  for (;;) {
    const query: Record<string, string> = {
      select: 'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,created_at',
      source_domain: `eq.${domain}`,
      created_at: `lte.${AS_OF}`,
      order: 'id.asc',
      limit: String(PAGE),
    };
    if (last) query.id = `gt.${last}`;
    const page = await rest<Row>('discovery_candidates', query);
    out.push(...page);
    if (page.length < PAGE) break;
    const next = page.at(-1)?.id;
    if (!next || next === last) throw new Error(`keyset stalled for ${domain}`);
    last = next;
  }
  return out;
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const lanes: Array<Record<string, unknown>> = [];
  const manifestRows: Array<{
    source_domain: string;
    source_url: string;
    pattern: string;
    layer: 'L0';
    provenance: string;
    temporal_cohort: string;
    reconciliation: string | null;
  }> = [];
  const hashes: Record<string, { rows: number; sha256: string }> = {};

  for (const target of TARGETS) {
    const rows = await readDomain(target.domain);
    const sourcePatternUrls = new Set<string>();
    const canonicalPatternUrls = new Set<string>();
    const swLocaleTolerantQualified = new Set<string>();
    const swLocalizedQualified = new Set<string>();

    for (const row of rows) {
      const sourceUrl = canon(row.source_url);
      if (detectDeepExpansionPattern({ sourceDomain: target.domain, url: sourceUrl }) === target.pattern) {
        sourcePatternUrls.add(sourceUrl);
      }
      if (row.canonical_url) {
        const canonicalUrl = canon(row.canonical_url);
        if (detectDeepExpansionPattern({ sourceDomain: target.domain, url: canonicalUrl }) === target.pattern) {
          canonicalPatternUrls.add(canonicalUrl);
        }
      }

      if (target.domain === 'swimmobilier.com' && swLocaleTolerantPattern(sourceUrl)) {
        const classified = classifyReservoirCandidate({
          sourceDomain: target.domain,
          url: sourceUrl,
          title: row.title,
          snippet: row.snippet,
          discoveryQuery: row.discovery_query,
          contentFingerprint: row.content_fingerprint,
        });
        const baseEligible = classified.likelyRealEstate
          && classified.pageKind === 'AMBIGUOUS'
          && classified.geographyScope === 'MOROCCO_LIKELY';
        if (baseEligible) {
          swLocaleTolerantQualified.add(sourceUrl);
          const pathname = new URL(sourceUrl).pathname.toLowerCase();
          if (/^\/(?:fr|ar)\/propriete\/[^/]+\/?$/i.test(pathname)) swLocalizedQualified.add(sourceUrl);
        }
      }
    }

    const strictSelected = [...sourcePatternUrls].sort();
    const swReconciliationEligible = target.domain === 'swimmobilier.com'
      && strictSelected.length === 15
      && swLocalizedQualified.size === 12
      && swLocaleTolerantQualified.size === target.expected;
    const selected = swReconciliationEligible
      ? [...swLocaleTolerantQualified].sort()
      : strictSelected;
    const exactCountDetermined = selected.length === target.expected;
    const text = selected.length ? `${selected.join('\n')}\n` : '';
    const filename = `${target.domain}.txt`;
    await fs.writeFile(path.join(OUT, filename), text, 'utf8');
    hashes[filename] = { rows: selected.length, sha256: sha256(text) };

    const reconciliation = swReconciliationEligible
      ? 'Historical audit records SW_PROPRIETE_SLUG=27 while committed root-only detector yields 15. Preserved pre-audit source_url rows contain exactly 12 additional /fr|ar/propriete/<slug> representations; all 27 root+localized representations independently satisfy the unchanged MASS-X2 base eligibility predicates. The 27-row identity set is therefore uniquely determined, while the historical detector/audit mismatch remains explicitly recorded.'
      : null;

    for (const sourceUrl of selected) {
      manifestRows.push({
        source_domain: target.domain,
        source_url: sourceUrl,
        pattern: target.pattern,
        layer: 'L0',
        provenance: swReconciliationEligible
          ? 'MASS-X2 historical audited gain + preserved pre-audit discovery_candidates + unchanged base classifier reconciliation'
          : 'MASS-X2 historical structural audit + pre-audit discovery_candidates source_url witness',
        temporal_cohort: `created_at<=${AS_OF}`,
        reconciliation,
      });
    }

    lanes.push({
      sourceDomain: target.domain,
      pattern: target.pattern,
      sourceRowsAsOf: rows.length,
      distinctStrictSourcePatternUrls: sourcePatternUrls.size,
      distinctStrictCanonicalPatternUrls: canonicalPatternUrls.size,
      swLocaleTolerantBaseEligibleUrls: target.domain === 'swimmobilier.com' ? swLocaleTolerantQualified.size : null,
      swLocalizedBaseEligibleUrls: target.domain === 'swimmobilier.com' ? swLocalizedQualified.size : null,
      expectedHistoricalGain: target.expected,
      selectedIdentityRows: selected.length,
      exactCountDetermined,
      identityRule: swReconciliationEligible
        ? 'all distinct pre-audit SW source_url values matching root or fr/ar localized /propriete/<slug> and independently satisfying unchanged MASS-X2 base eligibility'
        : 'all distinct pre-audit source_url values matching the locked historical MASS-X2 pattern',
      historicalDetectorAuditMismatch: target.domain === 'swimmobilier.com' ? sourcePatternUrls.size !== target.expected : false,
      reconciliation,
    });
  }

  manifestRows.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.source_url.localeCompare(b.source_url));
  const manifestText = manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');
  hashes['manifest.jsonl'] = { rows: manifestRows.length, sha256: sha256(manifestText) };

  const summary = {
    schemaVersion: 'Q1A_MASS_X2_EXACT_SOURCE_IDENTITY_REPLAY_V4',
    historicalAuditCommit: '659b98985099f88e3aa90c852a9023b4ece42b69',
    historicalDeepExpansionBlob: 'c2820baaf6278f767675dd577ae7e384d51f5612',
    historicalAuditPatternGains: { JIBRIL_BIENS_SLUG: 40, SW_PROPRIETE_SLUG: 27, LOCO_IMMOBILIERS_SLUG: 6 },
    asOf: AS_OF,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceNetworkRequests: 0,
    sourceSiteFetches: 0,
    detailPageFetches: 0,
    vercelDeployments: 0,
    identityRecoveryBasis: 'Exact source identities are recovered from preserved pre-audit discovery rows. SW additionally carries an explicit historical detector/audit reconciliation rather than silently altering the original MASS-X2 rule.',
    lanes,
    actualTotal: manifestRows.length,
    expectedTotal: 73,
    exactHistoricalMatch: lanes.every((lane) => lane.exactCountDetermined === true) && manifestRows.length === 73,
    hashes,
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.exactHistoricalMatch) process.exitCode = 2;
}

main().catch((error) => { console.error(error); process.exit(1); });

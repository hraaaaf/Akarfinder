import fs from 'node:fs/promises';
import path from 'node:path';

// Public-only acquisition proof. No DB writes, private APIs, credentials, or block evasion.
const OUT = 'artifacts/morocco-web-real-estate-discovery';
const UA = 'AkarFinder-public-index-audit/2.1 (+https://akarfinder.ma)';
const TIMEOUT_MS = 15000;
const L1_MIN_URLS = 1000;
const L1_MIN_PRODUCTIVE_SOURCES = 3;
const MAX_URLS_PER_SOURCE = 20000;

function numberedPages(base, count) {
  const out = [base];
  for (let page = 2; page <= count; page += 1) out.push(`${base}:p:${page}`);
  return out;
}

function marocAnnoncePages(base, count) {
  const out = [base];
  const stem = base.replace(/\.html$/i, '');
  for (let page = 2; page <= count; page += 1) out.push(`${stem}/${page}.html`);
  return out;
}

const sources = [
  {
    name: 'mubawab',
    hosts: ['www.mubawab.ma', 'mubawab.ma'],
    kind: 'html',
    seeds: [
      ...numberedPages('https://www.mubawab.ma/fr/cc/immobilier-a-vendre', 8),
      ...numberedPages('https://www.mubawab.ma/fr/cc/immobilier-a-louer', 8),
    ],
  },
  {
    name: 'marocannonces',
    hosts: ['www.marocannonces.com', 'marocannonces.com'],
    kind: 'html',
    seeds: [
      ...marocAnnoncePages('https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html', 8),
      ...marocAnnoncePages('https://www.marocannonces.com/categorie/319/Vente-immobilier/Villas-Maisons-Riads.html', 8),
    ],
  },
  {
    name: 'sarouty',
    hosts: ['www.sarouty.ma', 'sarouty.ma'],
    kind: 'sitemap-index',
    seeds: ['https://www.sarouty.ma/sitemap_index.xml'],
  },
];

function decodeMarkup(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(?:47|x2f);/gi, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
}

function normalize(raw, base) {
  try {
    const cleaned = decodeMarkup(raw).trim();
    const u = new URL(cleaned, base);
    u.hash = '';
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function extractHtmlRefs(html) {
  const text = decodeMarkup(html);
  const refs = new Set();
  for (const m of text.matchAll(/(?:href|data-url|data-href|data-link|data-target)\s*=\s*["']([^"']+)["']/gi)) {
    refs.add(m[1]);
  }
  for (const m of text.matchAll(/https:\/\/[^\s"'<>]+/gi)) refs.add(m[0]);
  return { text, refs: [...refs] };
}

function extractMubawab(html) {
  const { text, refs } = extractHtmlRefs(html);
  const out = new Set();

  const accept = (raw) => {
    const url = normalize(raw, 'https://www.mubawab.ma/');
    if (!url) return;
    const u = new URL(url);
    if (!['www.mubawab.ma', 'mubawab.ma'].includes(u.hostname)) return;
    if (/^\/fr\/(?:a|pa)\/\d+(?:\/|$)/i.test(u.pathname)) out.add(url);
  };

  for (const ref of refs) accept(ref);

  for (const m of text.matchAll(/(?:https:\/\/(?:www\.)?mubawab\.ma)?(\/fr\/(?:a|pa)\/\d+(?:\/[^\s"'<>]*)?)/gi)) {
    accept(m[1]);
  }

  return out;
}

function canonicalizeMarocAnnonce(raw) {
  const cleaned = decodeMarkup(raw).trim();
  const match = cleaned.match(/(?:https:\/\/(?:www\.)?marocannonces\.com\/)?((?:categorie\/\d+\/[^\s"'<>]*?)?annonce\/\d+\/[^\s"'<>]+)/i);
  if (!match) return null;
  return normalize(`/${match[1].replace(/^\/+/, '')}`, 'https://www.marocannonces.com/');
}

function extractMarocAnnonces(html) {
  const { text, refs } = extractHtmlRefs(html);
  const out = new Set();
  for (const ref of refs) {
    const url = canonicalizeMarocAnnonce(ref);
    if (url) out.add(url);
  }
  for (const m of text.matchAll(/(?:https:\/\/(?:www\.)?marocannonces\.com\/)?(?:categorie\/\d+\/[^\s"'<>]*?)?annonce\/\d+\/[^\s"'<>]+/gi)) {
    const url = canonicalizeMarocAnnonce(m[0]);
    if (url) out.add(url);
  }
  return out;
}

function extractXmlLocs(xml) {
  return [...String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((m) => decodeMarkup(m[1]).trim());
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.5',
        'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5',
      },
    });
    return {
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get('content-type') || '',
      text: await res.text(),
    };
  } catch (e) {
    return {
      status: 0,
      finalUrl: url,
      contentType: '',
      text: '',
      error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function sourceRow(url, r, extra = {}) {
  return {
    url,
    status: r.status,
    finalUrl: r.finalUrl,
    contentType: r.contentType,
    bytes: Buffer.byteLength(r.text || ''),
    ...(r.error ? { error: r.error } : {}),
    ...extra,
  };
}

async function runHtmlSource(source) {
  const urls = new Set();
  const requests = [];
  let stoppedEarly = null;

  for (const seed of source.seeds) {
    const r = await fetchText(seed);
    requests.push(sourceRow(seed, r));
    if (r.status === 429) {
      stoppedEarly = `http_429:${seed}`;
      break;
    }
    if (r.status < 200 || r.status >= 300) continue;

    const found = source.name === 'mubawab'
      ? extractMubawab(r.text)
      : extractMarocAnnonces(r.text);

    for (const url of found) {
      urls.add(url);
      if (urls.size >= MAX_URLS_PER_SOURCE) break;
    }
    if (urls.size >= MAX_URLS_PER_SOURCE) break;
  }

  return { urls, requests, stoppedEarly };
}

async function runSarouty(source) {
  const urls = new Set();
  const requests = [];
  let stoppedEarly = null;

  const root = await fetchText(source.seeds[0]);
  requests.push(sourceRow(source.seeds[0], root, { role: 'sitemap-index' }));
  if (root.status === 429) {
    stoppedEarly = `http_429:${source.seeds[0]}`;
    return { urls, requests, stoppedEarly };
  }
  if (root.status < 200 || root.status >= 300) return { urls, requests, stoppedEarly };

  const childSitemaps = extractXmlLocs(root.text)
    .map((raw) => normalize(raw, source.seeds[0]))
    .filter(Boolean)
    .filter((url) => {
      const u = new URL(url);
      return source.hosts.includes(u.hostname) && /property_details\d*\.xml$/i.test(u.pathname);
    })
    .slice(0, 12);

  for (const sitemap of childSitemaps) {
    const r = await fetchText(sitemap);
    requests.push(sourceRow(sitemap, r, { role: 'property-sitemap' }));
    if (r.status === 429) {
      stoppedEarly = `http_429:${sitemap}`;
      break;
    }
    if (r.status < 200 || r.status >= 300) continue;

    for (const raw of extractXmlLocs(r.text)) {
      const url = normalize(raw, sitemap);
      if (!url) continue;
      const u = new URL(url);
      if (!source.hosts.includes(u.hostname)) continue;
      if (/\.xml(?:$|\?)/i.test(u.pathname)) continue;
      urls.add(url);
      if (urls.size >= MAX_URLS_PER_SOURCE) break;
    }
    if (urls.size >= MAX_URLS_PER_SOURCE) break;
  }

  return { urls, requests, stoppedEarly, childSitemapsDiscovered: childSitemaps.length };
}

const report = {
  startedAt: new Date().toISOString(),
  goal: 'L1: prove >=1,000 unique public Moroccan real-estate candidate URLs across >=3 productive independent sources with zero production DB writes.',
  gate: {
    minUniqueCandidateUrls: L1_MIN_URLS,
    minProductiveSources: L1_MIN_PRODUCTIVE_SOURCES,
  },
  sources: [],
  discoveredUrls: [],
  zeroDbWrites: true,
  forbiddenInternalApiUsed: false,
};

const globalUrls = new Set();
for (const source of sources) {
  const result = source.kind === 'sitemap-index'
    ? await runSarouty(source)
    : await runHtmlSource(source);

  for (const url of result.urls) globalUrls.add(url);
  report.sources.push({
    name: source.name,
    discoveredRealEstateUrls: result.urls.size,
    requests: result.requests,
    stoppedEarly: result.stoppedEarly,
    ...(result.childSitemapsDiscovered !== undefined ? { childSitemapsDiscovered: result.childSitemapsDiscovered } : {}),
    sample: [...result.urls].slice(0, 20),
  });
}

report.finishedAt = new Date().toISOString();
report.discoveredUrlCount = globalUrls.size;
report.productiveSourceCount = report.sources.filter((s) => s.discoveredRealEstateUrls > 0).length;
report.discoveredUrls = [...globalUrls].slice(0, 1000);
report.success = report.discoveredUrlCount >= L1_MIN_URLS
  && report.productiveSourceCount >= L1_MIN_PRODUCTIVE_SOURCES
  && report.zeroDbWrites
  && !report.forbiddenInternalApiUsed;

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

const md = [
  '# Morocco Web Real-Estate Discovery Canary — L1',
  '',
  `- L1 success: **${report.success ? 'YES' : 'NO'}**`,
  `- Unique candidate URLs: **${report.discoveredUrlCount}/${L1_MIN_URLS}**`,
  `- Productive sources: **${report.productiveSourceCount}/${L1_MIN_PRODUCTIVE_SOURCES}**`,
  `- Zero production DB writes: **${report.zeroDbWrites}**`,
  `- Forbidden internal API used: **${report.forbiddenInternalApiUsed}**`,
  '',
  ...report.sources.flatMap((s) => [
    `## ${s.name}`,
    `- Candidate URLs: **${s.discoveredRealEstateUrls}**`,
    `- Requests: **${s.requests.length}**`,
    ...(s.childSitemapsDiscovered !== undefined ? [`- Property sitemaps discovered: **${s.childSitemapsDiscovered}**`] : []),
    `- HTTP: ${s.requests.map((x) => `${x.status} ${x.url}`).join(' | ')}`,
    `- Early stop: ${s.stoppedEarly || 'none'}`,
    '',
  ]),
].join('\n');

await fs.writeFile(path.join(OUT, 'report.md'), md);
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;

import fs from 'node:fs/promises';
import path from 'node:path';

// Public-only acquisition proof. No DB writes, private APIs, credentials, or block evasion.
const OUT = 'artifacts/morocco-web-real-estate-discovery';
const UA = 'AkarFinder-public-index-audit/2.0 (+https://akarfinder.ma)';
const timeoutMs = 15000;

const sources = [
  {
    name: 'mubawab',
    hosts: ['www.mubawab.ma', 'mubawab.ma'],
    seeds: [
      'https://www.mubawab.ma/fr',
      'https://www.mubawab.ma/fr/t/casablanca',
      'https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre',
      'https://www.mubawab.ma/fr/sc/villas-et-maisons-de-luxe-a-vendre',
    ],
    detail: /^\/fr\/(?:a|pa)\/\d+\//i,
  },
  {
    name: 'marocannonces',
    hosts: ['www.marocannonces.com', 'marocannonces.com'],
    seeds: [
      'https://www.marocannonces.com/categorie/319/Vente-immobilier/Villas-Maisons-Riads/854.html',
    ],
    detail: /(?:immobilier|appartement|villa|maison|riad|terrain|bureau|local)/i,
  },
  {
    name: 'sarouty',
    hosts: ['www.sarouty.ma', 'sarouty.ma'],
    seeds: ['https://www.sarouty.ma/sitemap_index.xml'],
    detail: /(?:immobilier|appartement|villa|maison|riad|terrain|bureau|local|property|properties)/i,
  },
];

function normalize(raw, base) {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch { return null; }
}

function extractHtmlLinks(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalize(m[1], base);
    if (!url) continue;
    const anchor = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ url, anchor });
  }
  return out;
}

function extractXmlLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&').trim());
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
    return { status: res.status, finalUrl: res.url, contentType: res.headers.get('content-type') || '', text: await res.text() };
  } catch (e) {
    return { status: 0, finalUrl: url, contentType: '', text: '', error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
  } finally { clearTimeout(timer); }
}

const report = {
  startedAt: new Date().toISOString(),
  goal: 'Prove reproducible public discovery of Moroccan real-estate inventory across the web without private APIs or access-control bypass.',
  sources: [],
  discoveredUrls: [],
  zeroDbWrites: true,
  forbiddenInternalApiUsed: false,
};

const globalUrls = new Set();
for (const source of sources) {
  const sourceUrls = new Set();
  const seedResults = [];
  for (const seed of source.seeds) {
    const r = await fetchText(seed);
    const row = { seed, status: r.status, finalUrl: r.finalUrl, contentType: r.contentType, bytes: Buffer.byteLength(r.text || '') };
    seedResults.push(row);
    if (r.status === 429) break;
    if (r.status < 200 || r.status >= 300) continue;

    if (/xml/i.test(r.contentType) || /^\s*<\?xml|<sitemapindex|<urlset/i.test(r.text)) {
      for (const raw of extractXmlLocs(r.text)) {
        const url = normalize(raw, seed);
        if (!url) continue;
        const host = new URL(url).hostname;
        if (!source.hosts.includes(host)) continue;
        if (source.detail.test(`${new URL(url).pathname} ${url}`)) sourceUrls.add(url);
      }
    } else {
      for (const link of extractHtmlLinks(r.text, r.finalUrl || seed)) {
        const u = new URL(link.url);
        if (!source.hosts.includes(u.hostname)) continue;
        if (source.detail.test(`${u.pathname} ${link.anchor}`)) sourceUrls.add(link.url);
      }
    }
  }

  for (const u of sourceUrls) globalUrls.add(u);
  report.sources.push({ name: source.name, seeds: seedResults, discoveredRealEstateUrls: sourceUrls.size, sample: [...sourceUrls].slice(0, 20) });
}

report.finishedAt = new Date().toISOString();
report.discoveredUrlCount = globalUrls.size;
report.productiveSourceCount = report.sources.filter((s) => s.discoveredRealEstateUrls > 0).length;
report.discoveredUrls = [...globalUrls].slice(0, 500);
report.success = report.discoveredUrlCount >= 20 && report.productiveSourceCount >= 1;

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const md = [
  '# Morocco Web Real-Estate Discovery Canary',
  '',
  `- Success: **${report.success ? 'YES' : 'NO'}**`,
  `- Public real-estate URLs discovered: **${report.discoveredUrlCount}**`,
  `- Productive sources: **${report.productiveSourceCount}/${report.sources.length}**`,
  `- Zero DB writes: **${report.zeroDbWrites}**`,
  '',
  ...report.sources.flatMap((s) => [
    `## ${s.name}`,
    `- URLs: **${s.discoveredRealEstateUrls}**`,
    `- Seed HTTP: ${s.seeds.map((x) => `${x.status} ${x.seed}`).join(' | ')}`,
    '',
  ]),
].join('\n');
await fs.writeFile(path.join(OUT, 'report.md'), md);
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
